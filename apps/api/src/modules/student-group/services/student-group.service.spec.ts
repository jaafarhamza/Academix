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
  const studentGroupCreate = jest.fn<Promise<StudentGroupRecord>, [unknown]>();
  const prismaService = {
    teacherSubject: {
      findFirst: teacherSubjectFindFirst,
    },
    studentGroup: {
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

  it('creates student-group linked to teacher-subject within center scope', async () => {
    teacherSubjectFindFirst.mockResolvedValueOnce({
      id: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
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

  it('throws NotFoundException when teacher-subject assignment is outside center scope', async () => {
    teacherSubjectFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        teacherSubjectId: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
        name: 'Group A',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.FIRST_YEAR,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(studentGroupCreate).not.toHaveBeenCalled();
  });

  it('throws ConflictException when group name already exists for cycle and year', async () => {
    teacherSubjectFindFirst.mockResolvedValueOnce({
      id: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
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
