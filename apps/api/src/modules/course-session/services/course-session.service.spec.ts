import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { DayOfWeek, SessionStatus } from '../../../generated/prisma/enums';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import {
  COURSE_SESSION_CANCELLED_EVENT,
  COURSE_SESSION_CREATED_EVENT,
  COURSE_SESSION_RESCHEDULED_EVENT,
} from '../constants/course-session.events';
import { CourseSessionService } from './course-session.service';

describe('CourseSessionService', () => {
  const courseSessionCount = jest.fn<Promise<number>, [unknown]>();
  const courseSessionCreate = jest.fn<Promise<unknown>, [unknown]>();
  const courseSessionFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const courseSessionUpdate = jest.fn<Promise<unknown>, [unknown]>();
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
      findFirst: courseSessionFindFirst,
      update: courseSessionUpdate,
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
    jest.resetAllMocks();
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

  it('cancels a scheduled session', async () => {
    courseSessionFindFirst.mockResolvedValueOnce({
      id: '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
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
    courseSessionUpdate.mockResolvedValueOnce({
      id: '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      studentId: null,
      studentGroupId: '343f6d33-80fe-4181-a053-3b059793ec68',
      roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      day: DayOfWeek.MONDAY,
      startTime: new Date('1970-01-01T14:00:00.000Z'),
      endTime: new Date('1970-01-01T16:00:00.000Z'),
      status: SessionStatus.CANCELLED,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:30:00.000Z'),
    });

    await expect(
      service.cancel(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
      ),
    ).resolves.toBeUndefined();

    expect(courseSessionFindFirst).toHaveBeenCalledWith({
      where: {
        id: '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
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
    expect(courseSessionUpdate).toHaveBeenCalledWith({
      where: {
        id: '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
      },
      data: {
        status: SessionStatus.CANCELLED,
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
      COURSE_SESSION_CANCELLED_EVENT,
      {
        session_id: '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_id: null,
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '14:00',
        end_time: '16:00',
        status: SessionStatus.CANCELLED,
        cancelled_at: '2026-04-01T10:30:00.000Z',
      },
    );
  });

  it('is idempotent when cancelling an already cancelled session', async () => {
    courseSessionFindFirst.mockResolvedValueOnce({
      id: '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
      status: SessionStatus.CANCELLED,
    });

    await expect(
      service.cancel(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
      ),
    ).resolves.toBeUndefined();

    expect(courseSessionUpdate).not.toHaveBeenCalled();
    expect(eventEmitterEmitAsync).not.toHaveBeenCalled();
  });

  it('throws not found when cancelling unknown session', async () => {
    courseSessionFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.cancel(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
      ),
    ).rejects.toMatchObject({
      response: {
        message: 'Session not found',
      },
      status: 404,
    });

    expect(courseSessionUpdate).not.toHaveBeenCalled();
  });

  it('does not fail cancellation when event emission fails', async () => {
    courseSessionFindFirst.mockResolvedValueOnce({
      id: '58f2f551-9a46-4dbd-a6a4-e1cf0d6e0971',
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
    courseSessionUpdate.mockResolvedValueOnce({
      id: '58f2f551-9a46-4dbd-a6a4-e1cf0d6e0971',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      studentId: null,
      studentGroupId: '343f6d33-80fe-4181-a053-3b059793ec68',
      roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      day: DayOfWeek.MONDAY,
      startTime: new Date('1970-01-01T14:00:00.000Z'),
      endTime: new Date('1970-01-01T16:00:00.000Z'),
      status: SessionStatus.CANCELLED,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:30:00.000Z'),
    });
    eventEmitterEmitAsync.mockRejectedValueOnce(new Error('Event bus down'));

    await expect(
      service.cancel(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '58f2f551-9a46-4dbd-a6a4-e1cf0d6e0971',
      ),
    ).resolves.toBeUndefined();

    expect(courseSessionUpdate).toHaveBeenCalledTimes(1);
    expect(eventEmitterEmitAsync).toHaveBeenCalledWith(
      COURSE_SESSION_CANCELLED_EVENT,
      expect.objectContaining({
        session_id: '58f2f551-9a46-4dbd-a6a4-e1cf0d6e0971',
        status: SessionStatus.CANCELLED,
      }),
    );
  });

  it('reschedules a group session with conflict re-validation', async () => {
    courseSessionFindFirst.mockResolvedValueOnce({
      id: '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
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
    courseSessionCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    courseSessionUpdate.mockResolvedValueOnce({
      id: '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      studentId: null,
      studentGroupId: '343f6d33-80fe-4181-a053-3b059793ec68',
      roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      day: DayOfWeek.TUESDAY,
      startTime: new Date('1970-01-01T15:00:00.000Z'),
      endTime: new Date('1970-01-01T16:00:00.000Z'),
      status: SessionStatus.SCHEDULED,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:30:00.000Z'),
    });

    const result = await service.reschedule(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
      {
        day: DayOfWeek.TUESDAY,
        start_time: '15:00',
        end_time: '16:00',
      },
    );

    expect(result).toMatchObject({
      id: '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
      day: DayOfWeek.TUESDAY,
      startTime: '15:00',
      endTime: '16:00',
    });
    expect(courseSessionCount).toHaveBeenCalledTimes(2);
    const firstCountCall = courseSessionCount.mock.calls[0]?.[0] as {
      where: {
        teacherId?: string;
        id?: {
          not?: string;
        };
      };
    };
    const secondCountCall = courseSessionCount.mock.calls[1]?.[0] as {
      where: {
        roomId?: string;
        id?: {
          not?: string;
        };
      };
    };
    expect(firstCountCall.where.teacherId).toBe(
      '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
    );
    expect(firstCountCall.where.id?.not).toBe(
      '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
    );
    expect(secondCountCall.where.roomId).toBe(
      '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
    );
    expect(secondCountCall.where.id?.not).toBe(
      '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
    );
    expect(eventEmitterEmitAsync).toHaveBeenCalledWith(
      COURSE_SESSION_RESCHEDULED_EVENT,
      {
        session_id: '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_id: null,
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        previous_day: DayOfWeek.MONDAY,
        previous_start_time: '14:00',
        previous_end_time: '16:00',
        day: DayOfWeek.TUESDAY,
        start_time: '15:00',
        end_time: '16:00',
        status: SessionStatus.SCHEDULED,
        rescheduled_at: '2026-04-01T10:30:00.000Z',
      },
    );
  });

  it('reschedules a private session and validates student conflicts', async () => {
    courseSessionFindFirst.mockResolvedValueOnce({
      id: '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      studentId: '64bcb903-71b2-4387-8876-2b378cbeb396',
      studentGroupId: null,
      roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      day: DayOfWeek.MONDAY,
      startTime: new Date('1970-01-01T08:00:00.000Z'),
      endTime: new Date('1970-01-01T09:00:00.000Z'),
      status: SessionStatus.SCHEDULED,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    });
    courseSessionCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    courseSessionUpdate.mockResolvedValueOnce({
      id: '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      studentId: '64bcb903-71b2-4387-8876-2b378cbeb396',
      studentGroupId: null,
      roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      day: DayOfWeek.WEDNESDAY,
      startTime: new Date('1970-01-01T09:00:00.000Z'),
      endTime: new Date('1970-01-01T10:00:00.000Z'),
      status: SessionStatus.SCHEDULED,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:30:00.000Z'),
    });

    await service.reschedule(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
      {
        day: DayOfWeek.WEDNESDAY,
        start_time: '09:00',
        end_time: '10:00',
      },
    );

    expect(courseSessionCount).toHaveBeenCalledTimes(3);
    const thirdCountCall = courseSessionCount.mock.calls[2]?.[0] as {
      where: {
        OR?: Array<
          | { studentId: string }
          | {
              studentGroup: {
                enrollments: {
                  some: {
                    studentId: string;
                    isActive: boolean;
                  };
                };
              };
            }
        >;
      };
    };
    expect(thirdCountCall.where.OR).toEqual([
      {
        studentId: '64bcb903-71b2-4387-8876-2b378cbeb396',
      },
      {
        studentGroup: {
          enrollments: {
            some: {
              studentId: '64bcb903-71b2-4387-8876-2b378cbeb396',
              isActive: true,
            },
          },
        },
      },
    ]);
  });

  it('does not fail reschedule when event emission fails', async () => {
    courseSessionFindFirst.mockResolvedValueOnce({
      id: '9d8fd4f1-ca64-4c7e-a6c5-ecaa6103f5b3',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      studentId: null,
      studentGroupId: '343f6d33-80fe-4181-a053-3b059793ec68',
      roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      day: DayOfWeek.MONDAY,
      startTime: new Date('1970-01-01T13:00:00.000Z'),
      endTime: new Date('1970-01-01T14:00:00.000Z'),
      status: SessionStatus.SCHEDULED,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    });
    courseSessionCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    courseSessionUpdate.mockResolvedValueOnce({
      id: '9d8fd4f1-ca64-4c7e-a6c5-ecaa6103f5b3',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      studentId: null,
      studentGroupId: '343f6d33-80fe-4181-a053-3b059793ec68',
      roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      day: DayOfWeek.TUESDAY,
      startTime: new Date('1970-01-01T15:00:00.000Z'),
      endTime: new Date('1970-01-01T16:00:00.000Z'),
      status: SessionStatus.SCHEDULED,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:30:00.000Z'),
    });
    eventEmitterEmitAsync.mockRejectedValueOnce(new Error('Event bus down'));

    await expect(
      service.reschedule(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '9d8fd4f1-ca64-4c7e-a6c5-ecaa6103f5b3',
        {
          day: DayOfWeek.TUESDAY,
          start_time: '15:00',
          end_time: '16:00',
        },
      ),
    ).resolves.toMatchObject({
      id: '9d8fd4f1-ca64-4c7e-a6c5-ecaa6103f5b3',
      day: DayOfWeek.TUESDAY,
      startTime: '15:00',
      endTime: '16:00',
    });

    expect(eventEmitterEmitAsync).toHaveBeenCalledWith(
      COURSE_SESSION_RESCHEDULED_EVENT,
      expect.objectContaining({
        session_id: '9d8fd4f1-ca64-4c7e-a6c5-ecaa6103f5b3',
        previous_day: DayOfWeek.MONDAY,
        day: DayOfWeek.TUESDAY,
      }),
    );
  });

  it('throws not found when rescheduling unknown session', async () => {
    courseSessionFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.reschedule(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
        {
          day: DayOfWeek.MONDAY,
          start_time: '09:00',
          end_time: '10:00',
        },
      ),
    ).rejects.toMatchObject({
      response: {
        message: 'Session not found',
      },
      status: 404,
    });
  });

  it('rejects reschedule when session is not scheduled', async () => {
    courseSessionFindFirst.mockResolvedValueOnce({
      id: '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      studentId: null,
      studentGroupId: '343f6d33-80fe-4181-a053-3b059793ec68',
      roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      status: SessionStatus.CANCELLED,
    });

    await expect(
      service.reschedule(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '19ec157a-c9de-43f4-bcd4-78351f43c4a2',
        {
          day: DayOfWeek.MONDAY,
          start_time: '09:00',
          end_time: '10:00',
        },
      ),
    ).rejects.toMatchObject({
      response: {
        message: 'Only scheduled sessions can be rescheduled',
      },
      status: 409,
    });
    expect(courseSessionUpdate).not.toHaveBeenCalled();
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
    courseSessionCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
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
        studentId: null,
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

  it('creates a private session when student_id is provided', async () => {
    userFindFirst
      .mockResolvedValueOnce({
        id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      })
      .mockResolvedValueOnce({
        id: '64bcb903-71b2-4387-8876-2b378cbeb396',
      });
    subjectFindFirst.mockResolvedValueOnce({
      id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
    });
    roomFindFirst.mockResolvedValueOnce({
      id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      isAvailable: true,
    });
    courseSessionCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    courseSessionCreate.mockResolvedValueOnce({
      id: 'session-private-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      studentId: '64bcb903-71b2-4387-8876-2b378cbeb396',
      studentGroupId: null,
      roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      day: DayOfWeek.MONDAY,
      startTime: new Date('1970-01-01T07:30:00.000Z'),
      endTime: new Date('1970-01-01T08:30:00.000Z'),
      status: SessionStatus.SCHEDULED,
      createdAt: new Date('2026-04-01T10:10:00.000Z'),
      updatedAt: new Date('2026-04-01T10:10:00.000Z'),
    });

    const result = await service.create(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_id: '64bcb903-71b2-4387-8876-2b378cbeb396',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '07:30',
        end_time: '08:30',
      },
    );

    expect(result).toEqual({
      id: 'session-private-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      student_id: '64bcb903-71b2-4387-8876-2b378cbeb396',
      student_group_id: null,
      room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      day: DayOfWeek.MONDAY,
      startTime: '07:30',
      endTime: '08:30',
      status: SessionStatus.SCHEDULED,
      createdAt: '2026-04-01T10:10:00.000Z',
      updatedAt: '2026-04-01T10:10:00.000Z',
    });

    expect(studentGroupFindFirst).not.toHaveBeenCalled();
    expect(courseSessionCreate).toHaveBeenCalledWith({
      data: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        teacherId: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subjectId: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        studentId: '64bcb903-71b2-4387-8876-2b378cbeb396',
        studentGroupId: null,
        roomId: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        startTime: new Date('1970-01-01T07:30:00.000Z'),
        endTime: new Date('1970-01-01T08:30:00.000Z'),
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
  });

  it('applies the same conflict checks for private sessions', async () => {
    userFindFirst
      .mockResolvedValueOnce({
        id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      })
      .mockResolvedValueOnce({
        id: '64bcb903-71b2-4387-8876-2b378cbeb396',
      });
    subjectFindFirst.mockResolvedValueOnce({
      id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
    });
    roomFindFirst.mockResolvedValueOnce({
      id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      isAvailable: true,
    });
    courseSessionCount
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_id: '64bcb903-71b2-4387-8876-2b378cbeb396',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '10:00',
        end_time: '11:00',
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

    expect(studentGroupFindFirst).not.toHaveBeenCalled();
    expect(courseSessionCreate).not.toHaveBeenCalled();
  });

  it('returns student conflict for private session when student is already occupied', async () => {
    userFindFirst
      .mockResolvedValueOnce({
        id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      })
      .mockResolvedValueOnce({
        id: '64bcb903-71b2-4387-8876-2b378cbeb396',
      });
    subjectFindFirst.mockResolvedValueOnce({
      id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
    });
    roomFindFirst.mockResolvedValueOnce({
      id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      isAvailable: true,
    });
    courseSessionCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_id: '64bcb903-71b2-4387-8876-2b378cbeb396',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '10:00',
        end_time: '11:00',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Scheduling conflict detected',
        conflicts: [
          {
            type: 'STUDENT_TIME_OVERLAP',
            message: 'Student is not available for the selected day/time',
          },
        ],
      },
      status: 409,
    });

    expect(studentGroupFindFirst).not.toHaveBeenCalled();
    expect(courseSessionCreate).not.toHaveBeenCalled();
  });

  it('throws not found when private-session student does not exist in center scope', async () => {
    userFindFirst
      .mockResolvedValueOnce({
        id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      })
      .mockResolvedValueOnce(null);
    subjectFindFirst.mockResolvedValueOnce({
      id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
    });
    roomFindFirst.mockResolvedValueOnce({
      id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      isAvailable: true,
    });

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_id: '64bcb903-71b2-4387-8876-2b378cbeb396',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '11:00',
        end_time: '12:00',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Student not found',
      },
      status: 404,
    });

    expect(studentGroupFindFirst).not.toHaveBeenCalled();
    expect(courseSessionCount).not.toHaveBeenCalled();
    expect(courseSessionCreate).not.toHaveBeenCalled();
  });

  it('rejects create when both student_id and student_group_id are provided', async () => {
    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_id: '64bcb903-71b2-4387-8876-2b378cbeb396',
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '14:00',
        end_time: '16:00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(userFindFirst).not.toHaveBeenCalled();
    expect(subjectFindFirst).not.toHaveBeenCalled();
    expect(studentGroupFindFirst).not.toHaveBeenCalled();
    expect(roomFindFirst).not.toHaveBeenCalled();
    expect(courseSessionCreate).not.toHaveBeenCalled();
  });

  it('rejects create when neither student_id nor student_group_id is provided', async () => {
    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '14:00',
        end_time: '16:00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(userFindFirst).not.toHaveBeenCalled();
    expect(subjectFindFirst).not.toHaveBeenCalled();
    expect(studentGroupFindFirst).not.toHaveBeenCalled();
    expect(roomFindFirst).not.toHaveBeenCalled();
    expect(courseSessionCreate).not.toHaveBeenCalled();
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

  it('checks student overlap against private and enrolled-group sessions for private payload', async () => {
    courseSessionCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    await service.ensureNoSchedulingConflicts(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_id: '64bcb903-71b2-4387-8876-2b378cbeb396',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '08:00',
        end_time: '09:30',
      },
      {
        excludeSessionId: '35320f47-5728-4d5d-a753-98b9a09b6679',
      },
    );

    expect(courseSessionCount).toHaveBeenCalledTimes(3);
    expect(courseSessionCount).toHaveBeenNthCalledWith(3, {
      where: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
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
        OR: [
          {
            studentId: '64bcb903-71b2-4387-8876-2b378cbeb396',
          },
          {
            studentGroup: {
              enrollments: {
                some: {
                  studentId: '64bcb903-71b2-4387-8876-2b378cbeb396',
                  isActive: true,
                },
              },
            },
          },
        ],
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

  it('throws clear conflict details when student is overlapping in private session', async () => {
    courseSessionCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    await expect(
      service.ensureNoSchedulingConflicts(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        {
          teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
          subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
          student_id: '64bcb903-71b2-4387-8876-2b378cbeb396',
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
            type: 'STUDENT_TIME_OVERLAP',
            message: 'Student is not available for the selected day/time',
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
