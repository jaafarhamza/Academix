import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { DayOfWeek, SessionStatus } from '../../../generated/prisma/enums';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { COURSE_SESSION_CREATED_EVENT } from '../constants/course-session.events';
import { CourseSessionService } from './course-session.service';

describe('CourseSessionService', () => {
  const courseSessionCount = jest.fn<Promise<number>, [unknown]>();
  const courseSessionCreate = jest.fn<Promise<unknown>, [unknown]>();
  const userFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const subjectFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const studentGroupFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const roomFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const eventEmitterEmitAsync = jest.fn<
    Promise<unknown[]>,
    [string, unknown]
  >();
  const prismaService = {
    courseSession: {
      count: courseSessionCount,
      create: courseSessionCreate,
    },
    user: {
      findFirst: userFindFirst,
    },
    subject: {
      findFirst: subjectFindFirst,
    },
    studentGroup: {
      findFirst: studentGroupFindFirst,
    },
    room: {
      findFirst: roomFindFirst,
    },
  };
  const eventEmitter = {
    emitAsync: eventEmitterEmitAsync,
  };

  let service: CourseSessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    eventEmitterEmitAsync.mockResolvedValue([]);
    service = new CourseSessionService(
      prismaService as unknown as PrismaService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  it('returns course-session module ready status', () => {
    const result = service.getStatus();

    expect(result).toEqual({
      module: 'course-session',
      status: 'ready',
    });
  });

  it('creates a session when references are valid and no conflicts exist', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
    });
    subjectFindFirst.mockResolvedValueOnce({
      id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
    });
    studentGroupFindFirst.mockResolvedValueOnce({
      id: '343f6d33-80fe-4181-a053-3b059793ec68',
      teacherSubject: {
        teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      },
    });
    roomFindFirst.mockResolvedValueOnce({
      id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      isAvailable: true,
    });
    courseSessionCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    courseSessionCreate.mockResolvedValueOnce({
      id: 'session-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      studentId: null,
      studentGroupId: '343f6d33-80fe-4181-a053-3b059793ec68',
      roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      day: DayOfWeek.MONDAY,
      startTime: new Date('1970-01-01T14:00:00.000Z'),
      endTime: new Date('1970-01-01T16:00:00.000Z'),
      status: SessionStatus.SCHEDULED,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    });

    const result = await service.create(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '14:00',
        end_time: '16:00',
      },
    );

    expect(result).toEqual({
      id: 'session-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      student_id: null,
      student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
      room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      day: DayOfWeek.MONDAY,
      startTime: '14:00',
      endTime: '16:00',
      status: SessionStatus.SCHEDULED,
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
    });
    expect(courseSessionCreate).toHaveBeenCalledWith({
      data: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        studentGroupId: '343f6d33-80fe-4181-a053-3b059793ec68',
        roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        startTime: new Date('1970-01-01T14:00:00.000Z'),
        endTime: new Date('1970-01-01T16:00:00.000Z'),
      },
      select: {
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
      },
    });
    expect(eventEmitterEmitAsync).toHaveBeenCalledWith(
      COURSE_SESSION_CREATED_EVENT,
      {
        session_id: 'session-1',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_id: null,
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '14:00',
        end_time: '16:00',
        status: SessionStatus.SCHEDULED,
        created_at: '2026-04-01T10:00:00.000Z',
      },
    );
  });

  it('does not fail session creation when event emission fails', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
    });
    subjectFindFirst.mockResolvedValueOnce({
      id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
    });
    studentGroupFindFirst.mockResolvedValueOnce({
      id: '343f6d33-80fe-4181-a053-3b059793ec68',
      teacherSubject: {
        teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      },
    });
    roomFindFirst.mockResolvedValueOnce({
      id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      isAvailable: true,
    });
    courseSessionCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    courseSessionCreate.mockResolvedValueOnce({
      id: 'session-2',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      studentId: null,
      studentGroupId: '343f6d33-80fe-4181-a053-3b059793ec68',
      roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      day: DayOfWeek.MONDAY,
      startTime: new Date('1970-01-01T14:00:00.000Z'),
      endTime: new Date('1970-01-01T16:00:00.000Z'),
      status: SessionStatus.SCHEDULED,
      createdAt: new Date('2026-04-01T10:05:00.000Z'),
      updatedAt: new Date('2026-04-01T10:05:00.000Z'),
    });
    eventEmitterEmitAsync.mockRejectedValueOnce(new Error('Event bus down'));

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '14:00',
        end_time: '16:00',
      }),
    ).resolves.toMatchObject({
      id: 'session-2',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
    });
  });

  it('throws not found when teacher does not exist in center scope', async () => {
    userFindFirst.mockResolvedValueOnce(null);
    subjectFindFirst.mockResolvedValueOnce({
      id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
    });
    studentGroupFindFirst.mockResolvedValueOnce({
      id: '343f6d33-80fe-4181-a053-3b059793ec68',
      teacherSubject: {
        teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      },
    });
    roomFindFirst.mockResolvedValueOnce({
      id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      isAvailable: true,
    });

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '14:00',
        end_time: '16:00',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(courseSessionCount).not.toHaveBeenCalled();
    expect(courseSessionCreate).not.toHaveBeenCalled();
  });

  it('throws conflict when student group does not match teacher-subject pair', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
    });
    subjectFindFirst.mockResolvedValueOnce({
      id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
    });
    studentGroupFindFirst.mockResolvedValueOnce({
      id: '343f6d33-80fe-4181-a053-3b059793ec68',
      teacherSubject: {
        teacherId: 'other-teacher-id',
        subjectId: 'other-subject-id',
      },
    });
    roomFindFirst.mockResolvedValueOnce({
      id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      isAvailable: true,
    });

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '14:00',
        end_time: '16:00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(courseSessionCount).not.toHaveBeenCalled();
    expect(courseSessionCreate).not.toHaveBeenCalled();
  });

  it('throws clear scheduling conflict when overlap exists before create', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
    });
    subjectFindFirst.mockResolvedValueOnce({
      id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
    });
    studentGroupFindFirst.mockResolvedValueOnce({
      id: '343f6d33-80fe-4181-a053-3b059793ec68',
      teacherSubject: {
        teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      },
    });
    roomFindFirst.mockResolvedValueOnce({
      id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      isAvailable: true,
    });
    courseSessionCount.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '14:00',
        end_time: '16:00',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Scheduling conflict detected',
      },
      status: 409,
    });

    expect(courseSessionCreate).not.toHaveBeenCalled();
  });

  it('returns both teacher and room conflicts when both overlaps exist before create', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
    });
    subjectFindFirst.mockResolvedValueOnce({
      id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
    });
    studentGroupFindFirst.mockResolvedValueOnce({
      id: '343f6d33-80fe-4181-a053-3b059793ec68',
      teacherSubject: {
        teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      },
    });
    roomFindFirst.mockResolvedValueOnce({
      id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      isAvailable: true,
    });
    courseSessionCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '14:00',
        end_time: '16:00',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Scheduling conflict detected',
        conflicts: [
          {
            type: 'TEACHER_TIME_OVERLAP',
            message: 'Teacher is not available for the selected day/time',
          },
          {
            type: 'ROOM_TIME_OVERLAP',
            message: 'Room is already booked for the selected day/time',
          },
        ],
      },
      status: 409,
    });

    expect(courseSessionCreate).not.toHaveBeenCalled();
  });

  it('maps DB exclusion conflict to clear room overlap message', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
    });
    subjectFindFirst.mockResolvedValueOnce({
      id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
    });
    studentGroupFindFirst.mockResolvedValueOnce({
      id: '343f6d33-80fe-4181-a053-3b059793ec68',
      teacherSubject: {
        teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      },
    });
    roomFindFirst.mockResolvedValueOnce({
      id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      isAvailable: true,
    });
    courseSessionCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    courseSessionCreate.mockRejectedValueOnce({
      code: 'P2004',
      meta: {
        database_error: 'course_sessions_room_no_overlap_excl',
      },
    });

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '14:00',
        end_time: '16:00',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Scheduling conflict detected',
        conflicts: [
          {
            type: 'ROOM_TIME_OVERLAP',
            message: 'Room is already booked for the selected day/time',
          },
        ],
      },
      status: 409,
    });
  });

  it('passes when teacher has no overlapping session', async () => {
    courseSessionCount.mockResolvedValueOnce(0);

    await expect(
      service.ensureTeacherAvailability(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        {
          teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
          subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
          student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
          room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
          day: DayOfWeek.MONDAY,
          start_time: '14:00',
          end_time: '16:00',
        },
      ),
    ).resolves.toBeUndefined();

    expect(courseSessionCount).toHaveBeenCalledWith({
      where: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        day: DayOfWeek.MONDAY,
        status: {
          not: SessionStatus.CANCELLED,
        },
        startTime: {
          lt: new Date('1970-01-01T16:00:00.000Z'),
        },
        endTime: {
          gt: new Date('1970-01-01T14:00:00.000Z'),
        },
      },
    });
  });

  it('throws conflict when teacher has overlapping sessions', async () => {
    courseSessionCount.mockResolvedValueOnce(1);

    await expect(
      service.ensureTeacherAvailability(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        {
          teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
          subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
          student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
          room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
          day: DayOfWeek.TUESDAY,
          start_time: '09:00',
          end_time: '10:30',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('supports excluding one session when validating reschedule', async () => {
    courseSessionCount.mockResolvedValueOnce(0);

    await service.ensureTeacherAvailability(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.WEDNESDAY,
        start_time: '11:00',
        end_time: '12:00',
      },
      {
        excludeSessionId: '35320f47-5728-4d5d-a753-98b9a09b6679',
      },
    );

    expect(courseSessionCount).toHaveBeenCalledWith({
      where: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        day: DayOfWeek.WEDNESDAY,
        status: {
          not: SessionStatus.CANCELLED,
        },
        id: {
          not: '35320f47-5728-4d5d-a753-98b9a09b6679',
        },
        startTime: {
          lt: new Date('1970-01-01T12:00:00.000Z'),
        },
        endTime: {
          gt: new Date('1970-01-01T11:00:00.000Z'),
        },
      },
    });
  });

  it('passes when room has no overlapping session', async () => {
    courseSessionCount.mockResolvedValueOnce(0);

    await expect(
      service.ensureRoomAvailability('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.FRIDAY,
        start_time: '13:00',
        end_time: '14:30',
      }),
    ).resolves.toBeUndefined();

    expect(courseSessionCount).toHaveBeenCalledWith({
      where: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.FRIDAY,
        status: {
          not: SessionStatus.CANCELLED,
        },
        startTime: {
          lt: new Date('1970-01-01T14:30:00.000Z'),
        },
        endTime: {
          gt: new Date('1970-01-01T13:00:00.000Z'),
        },
      },
    });
  });

  it('throws conflict when room has overlapping sessions', async () => {
    courseSessionCount.mockResolvedValueOnce(1);

    await expect(
      service.ensureRoomAvailability('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.SATURDAY,
        start_time: '09:00',
        end_time: '10:00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('supports excluding one session when validating room reschedule', async () => {
    courseSessionCount.mockResolvedValueOnce(0);

    await service.ensureRoomAvailability(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.SUNDAY,
        start_time: '16:00',
        end_time: '17:30',
      },
      {
        excludeSessionId: '35320f47-5728-4d5d-a753-98b9a09b6679',
      },
    );

    expect(courseSessionCount).toHaveBeenCalledWith({
      where: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.SUNDAY,
        status: {
          not: SessionStatus.CANCELLED,
        },
        id: {
          not: '35320f47-5728-4d5d-a753-98b9a09b6679',
        },
        startTime: {
          lt: new Date('1970-01-01T17:30:00.000Z'),
        },
        endTime: {
          gt: new Date('1970-01-01T16:00:00.000Z'),
        },
      },
    });
  });

  it('passes combined conflict detection when no conflicts are found', async () => {
    courseSessionCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    await expect(
      service.ensureNoSchedulingConflicts(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        {
          teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
          subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
          student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
          room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
          day: DayOfWeek.MONDAY,
          start_time: '08:00',
          end_time: '09:00',
        },
      ),
    ).resolves.toBeUndefined();

    expect(courseSessionCount).toHaveBeenCalledTimes(2);
  });

  it('applies excludeSessionId to both overlap queries in combined conflict detection', async () => {
    courseSessionCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    await service.ensureNoSchedulingConflicts(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '08:00',
        end_time: '09:30',
      },
      {
        excludeSessionId: '35320f47-5728-4d5d-a753-98b9a09b6679',
      },
    );

    expect(courseSessionCount).toHaveBeenCalledTimes(2);
    expect(courseSessionCount).toHaveBeenNthCalledWith(1, {
      where: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        day: DayOfWeek.MONDAY,
        status: {
          not: SessionStatus.CANCELLED,
        },
        id: {
          not: '35320f47-5728-4d5d-a753-98b9a09b6679',
        },
        startTime: {
          lt: new Date('1970-01-01T09:30:00.000Z'),
        },
        endTime: {
          gt: new Date('1970-01-01T08:00:00.000Z'),
        },
      },
    });
    expect(courseSessionCount).toHaveBeenNthCalledWith(2, {
      where: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        status: {
          not: SessionStatus.CANCELLED,
        },
        id: {
          not: '35320f47-5728-4d5d-a753-98b9a09b6679',
        },
        startTime: {
          lt: new Date('1970-01-01T09:30:00.000Z'),
        },
        endTime: {
          gt: new Date('1970-01-01T08:00:00.000Z'),
        },
      },
    });
  });

  it('throws clear conflict details when teacher is overlapping', async () => {
    courseSessionCount.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(
      service.ensureNoSchedulingConflicts(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        {
          teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
          subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
          student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
          room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
          day: DayOfWeek.TUESDAY,
          start_time: '10:00',
          end_time: '11:00',
        },
      ),
    ).rejects.toMatchObject({
      response: {
        message: 'Scheduling conflict detected',
        conflicts: [
          {
            type: 'TEACHER_TIME_OVERLAP',
            message: 'Teacher is not available for the selected day/time',
          },
        ],
      },
      status: 409,
    });
  });

  it('throws clear conflict details when room is overlapping', async () => {
    courseSessionCount.mockResolvedValueOnce(0).mockResolvedValueOnce(2);

    await expect(
      service.ensureNoSchedulingConflicts(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        {
          teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
          subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
          student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
          room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
          day: DayOfWeek.WEDNESDAY,
          start_time: '11:00',
          end_time: '12:00',
        },
      ),
    ).rejects.toMatchObject({
      response: {
        message: 'Scheduling conflict detected',
        conflicts: [
          {
            type: 'ROOM_TIME_OVERLAP',
            message: 'Room is already booked for the selected day/time',
          },
        ],
      },
      status: 409,
    });
  });

  it('throws both conflict details when teacher and room overlap', async () => {
    courseSessionCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    await expect(
      service.ensureNoSchedulingConflicts(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        {
          teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
          subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
          student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
          room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
          day: DayOfWeek.THURSDAY,
          start_time: '12:00',
          end_time: '13:30',
        },
      ),
    ).rejects.toMatchObject({
      response: {
        message: 'Scheduling conflict detected',
        conflicts: [
          {
            type: 'TEACHER_TIME_OVERLAP',
            message: 'Teacher is not available for the selected day/time',
          },
          {
            type: 'ROOM_TIME_OVERLAP',
            message: 'Room is already booked for the selected day/time',
          },
        ],
      },
      status: 409,
    });
  });

  it('throws bad request when end time is not after start time', async () => {
    await expect(
      service.ensureTeacherAvailability(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        {
          teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
          subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
          student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
          room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
          day: DayOfWeek.THURSDAY,
          start_time: '10:00',
          end_time: '10:00',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(courseSessionCount).not.toHaveBeenCalled();
  });
});
