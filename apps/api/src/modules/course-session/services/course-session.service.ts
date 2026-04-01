import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { SessionStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { CourseSessionStatusResponseDto } from '../dto/course-session-status-response.dto';

type SessionOverlapTarget = 'teacher' | 'room';

type SchedulingConflict = {
  type: 'TEACHER_TIME_OVERLAP' | 'ROOM_TIME_OVERLAP';
  message: string;
};

@Injectable()
export class CourseSessionService {
  constructor(private readonly prismaService: PrismaService) {}

  getStatus(): CourseSessionStatusResponseDto {
    return {
      module: 'course-session',
      status: 'ready',
    };
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

    const [teacherConflicts, roomConflicts] = await Promise.all([
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
}
