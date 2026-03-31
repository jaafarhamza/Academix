import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { SubjectService } from './subject.service';

describe('SubjectService', () => {
  type SubjectRecord = {
    id: string;
    centerId: string;
    name: string;
    description: string;
  };

  type SubjectDetailRecord = SubjectRecord & {
    _count: {
      teacherSubjects: number;
      courseSessions: number;
    };
  };

  const subjectCreate = jest.fn<Promise<SubjectRecord>, [unknown]>();
  const subjectFindMany = jest.fn<Promise<SubjectRecord[]>, [unknown]>();
  const subjectFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const subjectUpdate = jest.fn<Promise<SubjectDetailRecord>, [unknown]>();
  const subjectDelete = jest.fn<Promise<void>, [unknown]>();

  const prismaService = {
    subject: {
      create: subjectCreate,
      findMany: subjectFindMany,
      findFirst: subjectFindFirst,
      update: subjectUpdate,
      delete: subjectDelete,
    },
  };

  let service: SubjectService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new SubjectService(prismaService as unknown as PrismaService);
  });

  it('creates subject with center_id from JWT context', async () => {
    subjectCreate.mockResolvedValueOnce({
      id: 'subject-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      name: 'Mathematics',
      description: 'Core mathematics for middle school',
    });

    const result = await service.create(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        name: 'Mathematics',
        description: 'Core mathematics for middle school',
      },
    );

    expect(result).toEqual({
      id: 'subject-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      name: 'Mathematics',
      description: 'Core mathematics for middle school',
    });

    const createArgs = subjectCreate.mock.calls[0]?.[0] as
      | {
          data: {
            centerId: string;
            name: string;
            description: string;
          };
        }
      | undefined;
    expect(createArgs?.data.centerId).toBe(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
    );
    expect(createArgs?.data.name).toBe('Mathematics');
  });

  it('throws ConflictException when subject name already exists for center', async () => {
    subjectCreate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['centerId', 'name'] },
    });

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        name: 'Mathematics',
        description: 'Core mathematics for middle school',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists subjects for current center with default pagination', async () => {
    subjectFindMany.mockResolvedValueOnce([
      {
        id: 'subject-1',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        name: 'Mathematics',
        description: 'Core mathematics for middle school',
      },
    ]);

    const result = await service.findAll(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.center_id).toBe('2cc4267d-f618-478f-aa2f-9699ecbe332f');

    const findManyArgs = subjectFindMany.mock.calls[0]?.[0] as
      | {
          skip: number;
          take: number;
          where: Record<string, unknown>;
        }
      | undefined;

    expect(findManyArgs?.skip).toBe(0);
    expect(findManyArgs?.take).toBe(20);
    expect(findManyArgs?.where).toEqual(
      expect.objectContaining({
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      }),
    );
  });

  it('applies search and pagination filters when listing subjects', async () => {
    subjectFindMany.mockResolvedValueOnce([]);

    await service.findAll('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
      search: 'math',
      page: 2,
      limit: 5,
    });

    const findManyArgs = subjectFindMany.mock.calls[0]?.[0] as
      | {
          skip: number;
          take: number;
          where: Record<string, unknown>;
        }
      | undefined;

    expect(findManyArgs?.skip).toBe(5);
    expect(findManyArgs?.take).toBe(5);
    expect(findManyArgs?.where).toEqual(
      expect.objectContaining({
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      }),
    );
  });

  it('returns subject details with computed counts', async () => {
    subjectFindFirst.mockResolvedValueOnce({
      id: 'subject-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      name: 'Mathematics',
      description: 'Core mathematics for middle school',
      _count: {
        teacherSubjects: 3,
        courseSessions: 18,
      },
    } satisfies SubjectDetailRecord);

    const result = await service.findOne(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );

    expect(result).toEqual({
      id: 'subject-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      name: 'Mathematics',
      description: 'Core mathematics for middle school',
      teacherAssignmentsCount: 3,
      sessionsCount: 18,
    });
  });

  it('throws NotFoundException when subject is missing in center', async () => {
    subjectFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.findOne(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates subject details and returns refreshed projection', async () => {
    subjectFindFirst
      .mockResolvedValueOnce({
        id: 'subject-1',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        name: 'Mathematics',
        description: 'Core mathematics for middle school',
        _count: {
          teacherSubjects: 1,
          courseSessions: 6,
        },
      } satisfies SubjectDetailRecord)
      .mockResolvedValueOnce({
        id: 'subject-1',
      });
    subjectUpdate.mockResolvedValueOnce({
      id: 'subject-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      name: 'Advanced Mathematics',
      description: 'Updated subject description',
      _count: {
        teacherSubjects: 2,
        courseSessions: 10,
      },
    });

    const result = await service.update(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      {
        name: 'Advanced Mathematics',
        description: 'Updated subject description',
      },
    );

    expect(result).toMatchObject({
      id: 'subject-1',
      name: 'Advanced Mathematics',
      teacherAssignmentsCount: 2,
      sessionsCount: 10,
    });
    expect(subjectUpdate).toHaveBeenCalledTimes(1);
  });

  it('returns existing subject when update payload has no mutable fields', async () => {
    subjectFindFirst.mockResolvedValueOnce({
      id: 'subject-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      name: 'Mathematics',
      description: 'Core mathematics for middle school',
      _count: {
        teacherSubjects: 2,
        courseSessions: 7,
      },
    } satisfies SubjectDetailRecord);

    const result = await service.update(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      {},
    );

    expect(result).toMatchObject({
      id: 'subject-1',
      name: 'Mathematics',
      teacherAssignmentsCount: 2,
      sessionsCount: 7,
    });
    expect(subjectUpdate).not.toHaveBeenCalled();
  });

  it('throws ConflictException when updating subject with duplicate name', async () => {
    subjectFindFirst.mockResolvedValueOnce({
      id: 'subject-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      name: 'Mathematics',
      description: 'Core mathematics for middle school',
      _count: {
        teacherSubjects: 2,
        courseSessions: 7,
      },
    } satisfies SubjectDetailRecord);
    subjectUpdate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['centerId', 'name'] },
    });

    await expect(
      service.update(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
        {
          name: 'Mathematics',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deletes subject when it exists in center scope', async () => {
    subjectFindFirst.mockResolvedValueOnce({ id: 'subject-1' });
    subjectDelete.mockResolvedValueOnce();

    await service.remove(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );

    expect(subjectDelete).toHaveBeenCalledWith({
      where: {
        id: '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      },
    });
  });

  it('throws NotFoundException when deleting unknown subject', async () => {
    subjectFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.remove(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when deleting subject referenced by other records', async () => {
    subjectFindFirst.mockResolvedValueOnce({ id: 'subject-1' });
    subjectDelete.mockRejectedValueOnce({
      code: 'P2003',
      meta: { field_name: 'teacher_subjects_subject_id_fkey' },
    });

    await expect(
      service.remove(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns ready status', () => {
    expect(service.getStatus()).toEqual({
      module: 'subject',
      status: 'ready',
    });
  });
});
