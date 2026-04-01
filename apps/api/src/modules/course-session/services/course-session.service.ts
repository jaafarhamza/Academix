import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SessionStatus, UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { COURSE_SESSION_CREATED_EVENT } from '../constants/course-session.events';
import { CourseSessionResponseDto } from '../dto/course-session-response.dto';
import { CreateSessionDto } from '../dto/create-session.dto';
import { RescheduleSessionDto } from '../dto/reschedule-session.dto';
import type { SessionCreatedEventPayload } from '../events/session-created.event';
import { CourseSessionStatusResponseDto } from '../dto/course-session-status-response.dto';

type SessionOverlapTarget = 'teacher' | 'room';

type SchedulingConflict = {
  type: 'TEACHER_TIME_OVERLAP' | 'ROOM_TIME_OVERLAP' | 'STUDENT_TIME_OVERLAP';
  message: string;
};

@Injectable()
export class CourseSessionService {
  private readonly logger = new Logger(CourseSessionService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    centerId: string,
    payload: CreateSessionDto,
  ): Promise<CourseSessionResponseDto> {
    const studentId = payload.student_id ?? null;
    const studentGroupId = payload.student_group_id ?? null;
    const hasStudentId = typeof studentId === 'string' && studentId.length > 0;
    const hasStudentGroupId =
      typeof studentGroupId === 'string' && studentGroupId.length > 0;

    if (hasStudentId === hasStudentGroupId) {
      throw new BadRequestException(
        'Exactly one of student_id or student_group_id must be provided',
      );
    }

    const [teacher, subject, student, studentGroup, room] = (await Promise.all([
      this.prismaService.user.findFirst({
        where: {
          id: payload.teacher_id,
          centerId,
          role: UserRole.TEACHER,
          isActive: true,
        },
        select: {
          id: true,
        },
      }),
      this.prismaService.subject.findFirst({
        where: {
          id: payload.subject_id,
          centerId,
        },
        select: {
          id: true,
        },
      }),
      hasStudentId
        ? this.prismaService.user.findFirst({
            where: {
              id: studentId,
              centerId,
              role: UserRole.STUDENT,
              isActive: true,
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
      hasStudentGroupId
        ? this.prismaService.studentGroup.findFirst({
            where: {
              id: studentGroupId,
              centerId,
            },
            select: {
              id: true,
              teacherSubject: {
                select: {
                  teacherId: true,
                  subjectId: true,
                },
              },
            },
          })
        : Promise.resolve(null),
      this.prismaService.room.findFirst({
        where: {
          id: payload.room_id,
          centerId,
        },
        select: {
          id: true,
          isAvailable: true,
        },
      }),
    ])) as [
      { id: string } | null,
      { id: string } | null,
      { id: string } | null,
      {
        id: string;
        teacherSubject: {
          teacherId: string;
          subjectId: string;
        };
      } | null,
      { id: string; isAvailable: boolean } | null,
    ];

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (hasStudentId && !student) {
      throw new NotFoundException('Student not found');
    }

    if (hasStudentGroupId && !studentGroup) {
      throw new NotFoundException('Student group not found');
    }

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (!room.isAvailable) {
      throw new ConflictException('Room is not available for scheduling');
    }

    if (
      hasStudentGroupId &&
      studentGroup &&
      (studentGroup.teacherSubject.teacherId !== teacher.id ||
        studentGroup.teacherSubject.subjectId !== subject.id)
    ) {
      throw new ConflictException(
        'Student group is not linked to the selected teacher and subject',
      );
    }

    const { startTime, endTime } = this.getValidatedTimeRange(
      payload.start_time,
      payload.end_time,
    );

    await this.ensureNoSchedulingConflicts(centerId, payload);

    try {
      const session = await this.prismaService.courseSession.create({
        data: {
          centerId,
          teacherId: teacher.id,
          subjectId: subject.id,
          studentId: hasStudentId ? (student?.id ?? null) : null,
          studentGroupId: hasStudentGroupId ? (studentGroup?.id ?? null) : null,
          roomId: room.id,
          day: payload.day,
          startTime,
          endTime,
        },
        select: this.getCourseSessionSelect(),
      });

      const response = this.toCourseSessionResponse(session);
      this.emitSessionCreatedEvent(response);

      return response;
    } catch (error: unknown) {
      if (this.isRoomNoOverlapConstraintError(error)) {
        throw new ConflictException({
          message: 'Scheduling conflict detected',
          conflicts: [
            {
              type: 'ROOM_TIME_OVERLAP',
              message: 'Room is already booked for the selected day/time',
            },
          ],
        });
      }

      throw error;
    }
  }

  getStatus(): CourseSessionStatusResponseDto {
    return {
      module: 'course-session',
      status: 'ready',
    };
  }

  async cancel(centerId: string, id: string): Promise<void> {
    const session = await this.prismaService.courseSession.findFirst({
      where: {
        id,
        centerId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status === SessionStatus.CANCELLED) {
      return;
    }

    await this.prismaService.courseSession.update({
      where: {
        id: session.id,
      },
      data: {
        status: SessionStatus.CANCELLED,
      },
      select: {
        id: true,
      },
    });
  }

  async reschedule(
    centerId: string,
    id: string,
    payload: RescheduleSessionDto,
  ): Promise<CourseSessionResponseDto> {
    const session = await this.prismaService.courseSession.findFirst({
      where: {
        id,
        centerId,
      },
      select: {
        id: true,
        centerId: true,
        teacherId: true,
        subjectId: true,
        studentId: true,
        studentGroupId: true,
        roomId: true,
        status: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new ConflictException('Only scheduled sessions can be rescheduled');
    }

    const conflictPayload: CreateSessionDto = {
      teacher_id: session.teacherId,
      subject_id: session.subjectId,
      room_id: session.roomId,
      day: payload.day,
      start_time: payload.start_time,
      end_time: payload.end_time,
      ...(session.studentId
        ? { student_id: session.studentId }
        : session.studentGroupId
          ? { student_group_id: session.studentGroupId }
          : {}),
    };

    if (!conflictPayload.student_id && !conflictPayload.student_group_id) {
      throw new BadRequestException(
        'Session must be linked to either student_id or student_group_id',
      );
    }

    await this.ensureNoSchedulingConflicts(centerId, conflictPayload, {
      excludeSessionId: id,
    });

    const { startTime, endTime } = this.getValidatedTimeRange(
      payload.start_time,
      payload.end_time,
    );

    try {
      const updatedSession = await this.prismaService.courseSession.update({
        where: {
          id: session.id,
        },
        data: {
          day: payload.day,
          startTime,
          endTime,
        },
        select: this.getCourseSessionSelect(),
      });

      return this.toCourseSessionResponse(updatedSession);
    } catch (error: unknown) {
      if (this.isRoomNoOverlapConstraintError(error)) {
        throw new ConflictException({
          message: 'Scheduling conflict detected',
          conflicts: [
            {
              type: 'ROOM_TIME_OVERLAP',
              message: 'Room is already booked for the selected day/time',
            },
          ],
        });
      }

      throw error;
    }
  }

  async ensureTeacherAvailability(
    centerId: string,
    payload: CreateSessionDto,
    options?: {
      excludeSessionId?: string;
    },
  ): Promise<void> {
    const { startTime, endTime } = this.getValidatedTimeRange(
      payload.start_time,
      payload.end_time,
    );

    const conflicts = await this.countSessionOverlaps(
      centerId,
      payload,
      'teacher',
      startTime,
      endTime,
      options,
    );

    if (conflicts > 0) {
      throw new ConflictException(
        'Teacher is not available for the selected day/time',
      );
    }
  }

  async ensureRoomAvailability(
    centerId: string,
    payload: CreateSessionDto,
    options?: {
      excludeSessionId?: string;
    },
  ): Promise<void> {
    const { startTime, endTime } = this.getValidatedTimeRange(
      payload.start_time,
      payload.end_time,
    );

    const conflicts = await this.countSessionOverlaps(
      centerId,
      payload,
      'room',
      startTime,
      endTime,
      options,
    );

    if (conflicts > 0) {
      throw new ConflictException(
        'Room is already booked for the selected day/time',
      );
    }
  }

  async ensureNoSchedulingConflicts(
    centerId: string,
    payload: CreateSessionDto,
    options?: {
      excludeSessionId?: string;
    },
  ): Promise<void> {
    const { startTime, endTime } = this.getValidatedTimeRange(
      payload.start_time,
      payload.end_time,
    );

    const [teacherConflicts, roomConflicts, studentConflicts] =
      await Promise.all([
        this.countSessionOverlaps(
          centerId,
          payload,
          'teacher',
          startTime,
          endTime,
          options,
        ),
        this.countSessionOverlaps(
          centerId,
          payload,
          'room',
          startTime,
          endTime,
          options,
        ),
        payload.student_id
          ? this.countStudentOverlaps(
              centerId,
              payload.student_id,
              payload,
              startTime,
              endTime,
              options,
            )
          : Promise.resolve(0),
      ]);

    const conflicts: SchedulingConflict[] = [];

    if (teacherConflicts > 0) {
      conflicts.push({
        type: 'TEACHER_TIME_OVERLAP',
        message: 'Teacher is not available for the selected day/time',
      });
    }

    if (roomConflicts > 0) {
      conflicts.push({
        type: 'ROOM_TIME_OVERLAP',
        message: 'Room is already booked for the selected day/time',
      });
    }

    if (studentConflicts > 0) {
      conflicts.push({
        type: 'STUDENT_TIME_OVERLAP',
        message: 'Student is not available for the selected day/time',
      });
    }

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Scheduling conflict detected',
        conflicts,
      });
    }
  }

  private async countSessionOverlaps(
    centerId: string,
    payload: CreateSessionDto,
    target: SessionOverlapTarget,
    startTime: Date,
    endTime: Date,
    options?: {
      excludeSessionId?: string;
    },
  ): Promise<number> {
    return this.prismaService.courseSession.count({
      where: {
        centerId,
        ...(target === 'teacher'
          ? {
              teacherId: payload.teacher_id,
            }
          : {
              roomId: payload.room_id,
            }),
        day: payload.day,
        status: {
          not: SessionStatus.CANCELLED,
        },
        ...(options?.excludeSessionId
          ? {
              id: {
                not: options.excludeSessionId,
              },
            }
          : {}),
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
      },
    });
  }

  private async countStudentOverlaps(
    centerId: string,
    studentId: string,
    payload: CreateSessionDto,
    startTime: Date,
    endTime: Date,
    options?: {
      excludeSessionId?: string;
    },
  ): Promise<number> {
    return this.prismaService.courseSession.count({
      where: {
        centerId,
        day: payload.day,
        status: {
          not: SessionStatus.CANCELLED,
        },
        ...(options?.excludeSessionId
          ? {
              id: {
                not: options.excludeSessionId,
              },
            }
          : {}),
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
        OR: [
          {
            studentId,
          },
          {
            studentGroup: {
              enrollments: {
                some: {
                  studentId,
                  isActive: true,
                },
              },
            },
          },
        ],
      },
    });
  }

  private getCourseSessionSelect() {
    return {
      id: true,
      centerId: true,
      teacherId: true,
      subjectId: true,
      studentId: true,
      studentGroupId: true,
      roomId: true,
      day: true,
      startTime: true,
      endTime: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  private toCourseSessionResponse(session: {
    id: string;
    centerId: string;
    teacherId: string;
    subjectId: string;
    studentId: string | null;
    studentGroupId: string | null;
    roomId: string;
    day: CreateSessionDto['day'];
    startTime: Date;
    endTime: Date;
    status: SessionStatus;
    createdAt: Date;
    updatedAt: Date;
  }): CourseSessionResponseDto {
    return {
      id: session.id,
      center_id: session.centerId,
      teacher_id: session.teacherId,
      subject_id: session.subjectId,
      student_id: session.studentId,
      student_group_id: session.studentGroupId,
      room_id: session.roomId,
      day: session.day,
      startTime: this.toTimeString(session.startTime),
      endTime: this.toTimeString(session.endTime),
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private emitSessionCreatedEvent(session: CourseSessionResponseDto): void {
    const payload: SessionCreatedEventPayload = {
      session_id: session.id,
      center_id: session.center_id,
      teacher_id: session.teacher_id,
      subject_id: session.subject_id,
      student_id: session.student_id,
      student_group_id: session.student_group_id,
      room_id: session.room_id,
      day: session.day,
      start_time: session.startTime,
      end_time: session.endTime,
      status: session.status,
      created_at: session.createdAt,
    };

    void this.eventEmitter
      .emitAsync(COURSE_SESSION_CREATED_EVENT, payload)
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown emitter error';
        this.logger.warn(
          `Failed to emit ${COURSE_SESSION_CREATED_EVENT} for session ${session.id}: ${message}`,
        );
      });
  }

  private toSessionTime(value: string): Date {
    const [hoursPart, minutesPart] = value.split(':');
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException('Invalid time format. Use HH:mm');
    }

    return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
  }

  private toTimeString(value: Date): string {
    const hours = value.getUTCHours().toString().padStart(2, '0');
    const minutes = value.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private getValidatedTimeRange(
    start: string,
    end: string,
  ): { startTime: Date; endTime: Date } {
    const startTime = this.toSessionTime(start);
    const endTime = this.toSessionTime(end);

    if (startTime.getTime() >= endTime.getTime()) {
      throw new BadRequestException('end_time must be after start_time');
    }

    return {
      startTime,
      endTime,
    };
  }

  private isRoomNoOverlapConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const record = error as {
      code?: unknown;
      meta?: { database_error?: unknown };
      message?: unknown;
    };

    if (record.code !== 'P2004') {
      return false;
    }

    const databaseError =
      typeof record.meta?.database_error === 'string'
        ? record.meta.database_error
        : '';
    const message = typeof record.message === 'string' ? record.message : '';

    return (
      databaseError.includes('course_sessions_room_no_overlap_excl') ||
      message.includes('course_sessions_room_no_overlap_excl')
    );
  }
}
