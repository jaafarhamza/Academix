import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { TeacherSubjectService } from './teacher-subject.service';

describe('TeacherSubjectService', () => {
  const userFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const subjectFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const teacherSubjectCreate = jest.fn<Promise<unknown>, [unknown]>();
  const prismaService = {
    user: {
      findFirst: userFindFirst,
    },
    subject: {
      findFirst: subjectFindFirst,
    },
    teacherSubject: {
      create: teacherSubjectCreate,
    },
  };

  let service: TeacherSubjectService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new TeacherSubjectService(
      prismaService as unknown as PrismaService,
    );
  });

  it('creates teacher-subject assignment inside current center scope', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      firstName: 'Nadia',
      lastName: 'Teacher',
      email: 'nadia.teacher@academix-demo.com',
    });
    subjectFindFirst.mockResolvedValueOnce({
      id: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      name: 'Mathematics',
    });
    teacherSubjectCreate.mockResolvedValueOnce({
      id: 'assignment-1',
      teacherId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      subjectId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      teacher: {
        id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        firstName: 'Nadia',
        lastName: 'Teacher',
        email: 'nadia.teacher@academix-demo.com',
      },
      subject: {
        id: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
        name: 'Mathematics',
      },
    });

    const result = await service.create(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        teacherId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        subjectId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      },
    );

    expect(result).toEqual({
      id: 'assignment-1',
      teacher_id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      subject_id: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      teacher: {
        id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        firstName: 'Nadia',
        lastName: 'Teacher',
        email: 'nadia.teacher@academix-demo.com',
      },
      subject: {
        id: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
        name: 'Mathematics',
      },
    });

    expect(userFindFirst).toHaveBeenCalledWith({
      where: {
        id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        role: UserRole.TEACHER,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    expect(subjectFindFirst).toHaveBeenCalledWith({
      where: {
        id: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      },
      select: {
        id: true,
        name: true,
      },
    });
    expect(teacherSubjectCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          teacherId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
          subjectId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
        },
      }),
    );
  });

  it('throws NotFoundException when teacher is missing in center', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacherId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        subjectId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(subjectFindFirst).not.toHaveBeenCalled();
    expect(teacherSubjectCreate).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when subject is missing in center', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      firstName: 'Nadia',
      lastName: 'Teacher',
      email: 'nadia.teacher@academix-demo.com',
    });
    subjectFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacherId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        subjectId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(teacherSubjectCreate).not.toHaveBeenCalled();
  });

  it('throws ConflictException when assignment already exists', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      firstName: 'Nadia',
      lastName: 'Teacher',
      email: 'nadia.teacher@academix-demo.com',
    });
    subjectFindFirst.mockResolvedValueOnce({
      id: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      name: 'Mathematics',
    });
    teacherSubjectCreate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['teacherId', 'subjectId'] },
    });

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacherId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
        subjectId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns ready status', () => {
    expect(service.getStatus()).toEqual({
      module: 'teacher-subject',
      status: 'ready',
    });
  });
});
