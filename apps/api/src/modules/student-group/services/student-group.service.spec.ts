import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import {
  SchoolCycle,
  SchoolYear,
  UserRole,
} from '../../../generated/prisma/enums';
import { StudentGroupService } from './student-group.service';

describe('StudentGroupService', () => {
  type StudentGroupRecord = {
    id: string;
    centerId: string;
    teacherSubjectId: string;
    name: string;
    schoolCycle: SchoolCycle;
    schoolYear: SchoolYear;
  };

  const teacherSubjectFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const studentGroupFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const studentGroupFindMany = jest.fn<
    Promise<StudentGroupRecord[]>,
    [unknown]
  >();
  const studentGroupCreate = jest.fn<Promise<StudentGroupRecord>, [unknown]>();
  const prismaService = {
    teacherSubject: {
      findFirst: teacherSubjectFindFirst,
    },
    studentGroup: {
      findFirst: studentGroupFindFirst,
      findMany: studentGroupFindMany,
      create: studentGroupCreate,
    },
  };

  let service: StudentGroupService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new StudentGroupService(
      prismaService as unknown as PrismaService,
    );
  });

  it('creates student-group with provided name linked to teacher-subject within center scope', async () => {
    teacherSubjectFindFirst.mockResolvedValueOnce({
      id: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
      teacher: {
        firstName: 'Nadia',
        lastName: 'Teacher',
      },
      subject: {
        name: 'Mathematics',
      },
    });
    studentGroupCreate.mockResolvedValueOnce({
      id: 'group-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherSubjectId: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
      name: 'Group A',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.FIRST_YEAR,
    });

    const result = await service.create(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        teacherSubjectId: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
        name: 'Group A',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.FIRST_YEAR,
      },
    );

    expect(result).toEqual({
      id: 'group-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacher_subject_id: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
      name: 'Group A',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.FIRST_YEAR,
    });

    expect(teacherSubjectFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
        teacher: {
          centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
          role: UserRole.TEACHER,
          isActive: true,
        },
        subject: {
          centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        },
      },
      select: {
        id: true,
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
      },
    });
    expect(studentGroupCreate).toHaveBeenCalledWith({
      data: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        teacherSubjectId: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
        name: 'Group A',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.FIRST_YEAR,
      },
      select: {
        id: true,
        centerId: true,
        teacherSubjectId: true,
        name: true,
        schoolCycle: true,
        schoolYear: true,
      },
    });
  });

  it('lists student-groups for current center with default pagination', async () => {
    studentGroupFindMany.mockResolvedValueOnce([
      {
        id: 'group-1',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        teacherSubjectId: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
        name: 'Group A',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.FIRST_YEAR,
      },
    ]);

    const result = await service.findAll(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {},
    );

    expect(result).toEqual([
      {
        id: 'group-1',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        teacher_subject_id: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
        name: 'Group A',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.FIRST_YEAR,
      },
    ]);

    expect(studentGroupFindMany).toHaveBeenCalledWith({
      where: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: 0,
      take: 20,
      select: {
        id: true,
        centerId: true,
        teacherSubjectId: true,
        name: true,
        schoolCycle: true,
        schoolYear: true,
      },
    });
  });

  it('applies level and teacher/subject filters when listing student-groups', async () => {
    studentGroupFindMany.mockResolvedValueOnce([]);

    await service.findAll('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.SECOND_YEAR,
      teacherId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      subjectId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      page: 2,
      limit: 5,
    });

    expect(studentGroupFindMany).toHaveBeenCalledWith({
      where: {
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.SECOND_YEAR,
        teacherSubject: {
          teacherId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
          subjectId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: 5,
      take: 5,
      select: {
        id: true,
        centerId: true,
        teacherSubjectId: true,
        name: true,
        schoolCycle: true,
        schoolYear: true,
      },
    });
  });

  it('returns student-group details with computed active studentNumbers', async () => {
    studentGroupFindFirst.mockResolvedValueOnce({
      id: 'group-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherSubjectId: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
      name: 'Group A',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.FIRST_YEAR,
      teacherSubject: {
        teacher: {
          id: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
          firstName: 'Nadia',
          lastName: 'Teacher',
        },
        subject: {
          id: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
          name: 'Mathematics',
        },
      },
      enrollments: [{ id: 'enroll-1' }, { id: 'enroll-2' }],
    });

    const result = await service.findOne(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'a93b5859-8efe-4f35-a943-e3ef3c2a7d5a',
    );

    expect(result).toEqual({
      id: 'group-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacher_subject_id: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
      name: 'Group A',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.FIRST_YEAR,
      teacherId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      teacherName: 'Nadia Teacher',
      subjectId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      subjectName: 'Mathematics',
      studentNumbers: 2,
    });

    expect(studentGroupFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'a93b5859-8efe-4f35-a943-e3ef3c2a7d5a',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      },
      select: {
        id: true,
        centerId: true,
        teacherSubjectId: true,
        name: true,
        schoolCycle: true,
        schoolYear: true,
        teacherSubject: {
          select: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            subject: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        enrollments: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
          },
        },
      },
    });
  });

  it('throws NotFoundException when student-group details are missing in center scope', async () => {
    studentGroupFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.findOne(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        'a93b5859-8efe-4f35-a943-e3ef3c2a7d5a',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('auto-generates group name from teacher and subject when name is missing', async () => {
    teacherSubjectFindFirst.mockResolvedValueOnce({
      id: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
      teacher: {
        firstName: 'Nadia',
        lastName: 'Teacher',
      },
      subject: {
        name: 'Mathematics',
      },
    });
    studentGroupCreate.mockResolvedValueOnce({
      id: 'group-2',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherSubjectId: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
      name: 'Nadia Teacher - Mathematics',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.FIRST_YEAR,
    });

    const result = await service.create(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        teacherSubjectId: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.FIRST_YEAR,
      },
    );

    expect(result.name).toBe('Nadia Teacher - Mathematics');
    const [firstCreateCall] = studentGroupCreate.mock.calls;

    if (!firstCreateCall) {
      throw new Error('Expected studentGroupCreate to be called');
    }

    const [firstCreateArgument] = firstCreateCall as [
      { data: { name: string } },
    ];
    expect(firstCreateArgument.data.name).toBe('Nadia Teacher - Mathematics');
  });

  it('retries auto-generated name with numeric suffix when first candidate already exists', async () => {
    teacherSubjectFindFirst.mockResolvedValueOnce({
      id: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
      teacher: {
        firstName: 'Nadia',
        lastName: 'Teacher',
      },
      subject: {
        name: 'Mathematics',
      },
    });
    studentGroupCreate
      .mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: ['centerId', 'name', 'schoolCycle', 'schoolYear'] },
      })
      .mockResolvedValueOnce({
        id: 'group-3',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        teacherSubjectId: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
        name: 'Nadia Teacher - Mathematics (2)',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.FIRST_YEAR,
      });

    const result = await service.create(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        teacherSubjectId: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.FIRST_YEAR,
      },
    );

    expect(result.name).toBe('Nadia Teacher - Mathematics (2)');
    expect(studentGroupCreate).toHaveBeenCalledTimes(2);
  });

  it('throws NotFoundException when teacher-subject assignment is outside center scope', async () => {
    teacherSubjectFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacherSubjectId: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.FIRST_YEAR,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(studentGroupCreate).not.toHaveBeenCalled();
  });

  it('throws ConflictException when provided group name already exists for cycle and year', async () => {
    teacherSubjectFindFirst.mockResolvedValueOnce({
      id: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
      teacher: {
        firstName: 'Nadia',
        lastName: 'Teacher',
      },
      subject: {
        name: 'Mathematics',
      },
    });
    studentGroupCreate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['centerId', 'name', 'schoolCycle', 'schoolYear'] },
    });

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacherSubjectId: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
        name: 'Group A',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.FIRST_YEAR,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns ready status', () => {
    expect(service.getStatus()).toEqual({
      module: 'student-group',
      status: 'ready',
    });
  });
});
