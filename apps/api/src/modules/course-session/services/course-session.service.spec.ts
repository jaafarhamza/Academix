import { BadRequestException, ConflictException } from '@nestjs/common';
import { DayOfWeek, SessionStatus } from '../../../generated/prisma/enums';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { CourseSessionService } from './course-session.service';

describe('CourseSessionService', () => {
  const courseSessionCount = jest.fn<Promise<number>, [unknown]>();
  const prismaService = {
    courseSession: {
      count: courseSessionCount,
    },
  };

  let service: CourseSessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CourseSessionService(
      prismaService as unknown as PrismaService,
    );
  });

  it('returns course-session module ready status', () => {
    const result = service.getStatus();

    expect(result).toEqual({
      module: 'course-session',
      status: 'ready',
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
