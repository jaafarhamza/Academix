import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { EnrollmentService } from './enrollment.service';

describe('EnrollmentService', () => {
  const userFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const studentGroupFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const enrollmentFindUnique = jest.fn<Promise<unknown>, [unknown]>();
  const enrollmentCreate = jest.fn<Promise<unknown>, [unknown]>();
  const enrollmentUpdate = jest.fn<Promise<unknown>, [unknown]>();

  const prismaService = {
    user: {
      findFirst: userFindFirst,
    },
    studentGroup: {
      findFirst: studentGroupFindFirst,
    },
    enrollment: {
      findUnique: enrollmentFindUnique,
      create: enrollmentCreate,
      update: enrollmentUpdate,
    },
  };

  let service: EnrollmentService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new EnrollmentService(prismaService as unknown as PrismaService);
  });

  it('creates enrollment for active student and group in center scope', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
    });
    studentGroupFindFirst.mockResolvedValueOnce({
      id: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
    });
    enrollmentFindUnique.mockResolvedValueOnce(null);
    enrollmentCreate.mockResolvedValueOnce({
      id: 'enrollment-1',
      studentId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      studentGroupId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      enrollmentDate: new Date('2026-04-01T00:00:00.000Z'),
      isActive: true,
    });

    const result = await service.create(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        studentId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        studentGroupId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
        enrollmentDate: '2026-04-01',
      },
    );

    expect(result).toEqual({
      id: 'enrollment-1',
      student_id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      student_group_id: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      enrollmentDate: '2026-04-01T00:00:00.000Z',
      isActive: true,
    });

    expect(userFindFirst).toHaveBeenCalledWith({
      where: {
        id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        role: UserRole.STUDENT,
        isActive: true,
      },
      select: { id: true },
    });
    expect(studentGroupFindFirst).toHaveBeenCalledWith({
      where: {
        id: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      },
      select: { id: true },
    });
    expect(enrollmentFindUnique).toHaveBeenCalledWith({
      where: {
        studentId_studentGroupId: {
          studentId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
          studentGroupId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
        },
      },
      select: {
        id: true,
        studentId: true,
        studentGroupId: true,
        enrollmentDate: true,
        isActive: true,
      },
    });
  });

  it('reactivates existing inactive enrollment', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
    });
    studentGroupFindFirst.mockResolvedValueOnce({
      id: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
    });
    enrollmentFindUnique.mockResolvedValueOnce({
      id: 'enrollment-1',
      studentId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      studentGroupId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      enrollmentDate: new Date('2026-03-01T00:00:00.000Z'),
      isActive: false,
    });
    enrollmentUpdate.mockResolvedValueOnce({
      id: 'enrollment-1',
      studentId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      studentGroupId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      enrollmentDate: new Date('2026-04-02T00:00:00.000Z'),
      isActive: true,
    });

    const result = await service.create(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        studentId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        studentGroupId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
        enrollmentDate: '2026-04-02',
      },
    );

    expect(result.isActive).toBe(true);
    expect(enrollmentCreate).not.toHaveBeenCalled();
    expect(enrollmentUpdate).toHaveBeenCalledWith({
      where: {
        id: 'enrollment-1',
      },
      data: {
        isActive: true,
        enrollmentDate: new Date('2026-04-02'),
      },
      select: {
        id: true,
        studentId: true,
        studentGroupId: true,
        enrollmentDate: true,
        isActive: true,
      },
    });
  });

  it('throws ConflictException when student is already actively enrolled in group', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
    });
    studentGroupFindFirst.mockResolvedValueOnce({
      id: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
    });
    enrollmentFindUnique.mockResolvedValueOnce({
      id: 'enrollment-1',
      studentId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      studentGroupId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      enrollmentDate: new Date('2026-03-01T00:00:00.000Z'),
      isActive: true,
    });

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        studentId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        studentGroupId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(enrollmentCreate).not.toHaveBeenCalled();
    expect(enrollmentUpdate).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when student does not exist in center scope', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        studentId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        studentGroupId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(studentGroupFindFirst).not.toHaveBeenCalled();
    expect(enrollmentFindUnique).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when student group does not exist in center scope', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
    });
    studentGroupFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        studentId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        studentGroupId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(enrollmentFindUnique).not.toHaveBeenCalled();
  });

  it('throws ConflictException when create race condition hits unique constraint', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
    });
    studentGroupFindFirst.mockResolvedValueOnce({
      id: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
    });
    enrollmentFindUnique.mockResolvedValueOnce(null);
    enrollmentCreate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['studentId', 'studentGroupId'] },
    });

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        studentId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        studentGroupId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns ready status', () => {
    expect(service.getStatus()).toEqual({
      module: 'enrollment',
      status: 'ready',
    });
  });
});
