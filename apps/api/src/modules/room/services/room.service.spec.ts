import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DayOfWeek, SessionStatus } from '../../../generated/prisma/enums';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { RoomService } from './room.service';

describe('RoomService', () => {
  const roomCreate = jest.fn<Promise<unknown>, [unknown]>();
  const roomFindMany = jest.fn<Promise<unknown>, [unknown]>();
  const roomFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const roomUpdate = jest.fn<Promise<unknown>, [unknown]>();
  const roomDelete = jest.fn<Promise<unknown>, [unknown]>();
  const courseSessionCount = jest.fn<Promise<unknown>, [unknown]>();

  const prismaService = {
    room: {
      create: roomCreate,
      findMany: roomFindMany,
      findFirst: roomFindFirst,
      update: roomUpdate,
      delete: roomDelete,
    },
    courseSession: {
      count: courseSessionCount,
    },
  };

  let service: RoomService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new RoomService(prismaService as unknown as PrismaService);
  });

  it('creates room in the current center scope', async () => {
    roomCreate.mockResolvedValueOnce({
      id: 'room-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      floor: 2,
      roomName: 'Room B2',
      isAvailable: true,
    });

    const result = await service.create(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        floor: 2,
        roomName: 'Room B2',
        isAvailable: true,
      },
    );

    expect(result).toEqual({
      id: 'room-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      floor: 2,
      roomName: 'Room B2',
      isAvailable: true,
    });
    expect(roomCreate).toHaveBeenCalledWith({
      data: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        floor: 2,
        roomName: 'Room B2',
        isAvailable: true,
      },
      select: {
        id: true,
        centerId: true,
        floor: true,
        roomName: true,
        isAvailable: true,
      },
    });
  });

  it('throws conflict when room unique constraint is violated on create', async () => {
    roomCreate.mockRejectedValueOnce({ code: 'P2002' });

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        floor: 1,
        roomName: 'Room A1',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('lists rooms with filters and pagination', async () => {
    roomFindMany.mockResolvedValueOnce([
      {
        id: 'room-1',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        floor: 1,
        roomName: 'Room A1',
        isAvailable: true,
      },
    ]);

    const result = await service.findAll(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        floor: 1,
        isAvailable: true,
        search: 'A1',
        page: 2,
        limit: 10,
      },
    );

    expect(result).toEqual([
      {
        id: 'room-1',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        floor: 1,
        roomName: 'Room A1',
        isAvailable: true,
      },
    ]);
    expect(roomFindMany).toHaveBeenCalledWith({
      where: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        floor: 1,
        isAvailable: true,
        roomName: {
          contains: 'A1',
          mode: 'insensitive',
        },
      },
      orderBy: [{ floor: 'asc' }, { roomName: 'asc' }, { id: 'asc' }],
      skip: 10,
      take: 10,
      select: {
        id: true,
        centerId: true,
        floor: true,
        roomName: true,
        isAvailable: true,
      },
    });
  });

  it('returns room detail with sessions count', async () => {
    roomFindFirst.mockResolvedValueOnce({
      id: 'room-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      floor: 2,
      roomName: 'Room B2',
      isAvailable: false,
      _count: {
        courseSessions: 3,
      },
    });

    const result = await service.findOne(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );

    expect(result).toEqual({
      id: 'room-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      floor: 2,
      roomName: 'Room B2',
      isAvailable: false,
      sessionsCount: 3,
    });
  });

  it('throws not found when room detail is outside center scope', async () => {
    roomFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.findOne(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates room fields and returns refreshed detail', async () => {
    roomFindFirst
      .mockResolvedValueOnce({
        id: 'room-1',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        floor: 1,
        roomName: 'Room A1',
        isAvailable: true,
        _count: {
          courseSessions: 0,
        },
      })
      .mockResolvedValueOnce({
        id: 'room-1',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        floor: 1,
        roomName: 'Room A1',
        isAvailable: false,
        _count: {
          courseSessions: 1,
        },
      });
    roomUpdate.mockResolvedValueOnce({
      id: 'room-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      floor: 1,
      roomName: 'Room A1',
      isAvailable: false,
      _count: {
        courseSessions: 1,
      },
    });

    const result = await service.update(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      { isAvailable: false },
    );

    expect(result).toEqual({
      id: 'room-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      floor: 1,
      roomName: 'Room A1',
      isAvailable: false,
      sessionsCount: 1,
    });
    expect(roomUpdate).toHaveBeenCalledWith({
      where: {
        id: '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      },
      data: {
        isAvailable: false,
      },
      select: {
        id: true,
        centerId: true,
        floor: true,
        roomName: true,
        isAvailable: true,
        _count: {
          select: {
            courseSessions: true,
          },
        },
      },
    });
  });

  it('throws conflict when room unique constraint is violated on update', async () => {
    roomFindFirst.mockResolvedValueOnce({
      id: 'room-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      floor: 1,
      roomName: 'Room A1',
      isAvailable: true,
      _count: {
        courseSessions: 0,
      },
    });
    roomUpdate.mockRejectedValueOnce({ code: 'P2002' });

    await expect(
      service.update(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
        { floor: 1, roomName: 'Room A1' },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('deletes room within center scope', async () => {
    roomFindFirst.mockResolvedValueOnce({
      id: 'room-1',
    });
    roomDelete.mockResolvedValueOnce({
      id: 'room-1',
    });

    await service.remove(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );

    expect(roomDelete).toHaveBeenCalledWith({
      where: {
        id: '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      },
    });
  });

  it('throws conflict when deleting room linked to course sessions', async () => {
    roomFindFirst.mockResolvedValueOnce({
      id: 'room-1',
    });
    roomDelete.mockRejectedValueOnce({ code: 'P2003' });

    await expect(
      service.remove(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('returns room module ready status', () => {
    const result = service.getStatus();

    expect(result).toEqual({
      module: 'room',
      status: 'ready',
    });
  });

  it('returns isBooked=true when overlapping room sessions exist', async () => {
    roomFindFirst.mockResolvedValueOnce({
      id: 'room-1',
    });
    courseSessionCount.mockResolvedValueOnce(2);

    const result = await service.isBookedAt(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      {
        day: DayOfWeek.MONDAY,
        start: '09:30',
        end: '10:30',
      },
    );

    expect(result).toEqual({
      room_id: '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      day: DayOfWeek.MONDAY,
      start: '09:30',
      end: '10:30',
      isBooked: true,
      conflictingSessions: 2,
    });
    expect(courseSessionCount).toHaveBeenCalledWith({
      where: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        roomId: '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
        day: DayOfWeek.MONDAY,
        status: {
          not: SessionStatus.CANCELLED,
        },
        startTime: {
          lt: new Date('1970-01-01T10:30:00.000Z'),
        },
        endTime: {
          gt: new Date('1970-01-01T09:30:00.000Z'),
        },
      },
    });
  });

  it('returns isBooked=false when no overlapping room sessions exist', async () => {
    roomFindFirst.mockResolvedValueOnce({
      id: 'room-1',
    });
    courseSessionCount.mockResolvedValueOnce(0);

    const result = await service.isBookedAt(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      {
        day: DayOfWeek.THURSDAY,
        start: '14:00',
        end: '15:00',
      },
    );

    expect(result).toEqual({
      room_id: '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      day: DayOfWeek.THURSDAY,
      start: '14:00',
      end: '15:00',
      isBooked: false,
      conflictingSessions: 0,
    });
  });

  it('throws bad request when end time is not after start time', async () => {
    roomFindFirst.mockResolvedValueOnce({
      id: 'room-1',
    });

    await expect(
      service.isBookedAt(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
        {
          day: DayOfWeek.FRIDAY,
          start: '12:00',
          end: '12:00',
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(courseSessionCount).not.toHaveBeenCalled();
  });
});
