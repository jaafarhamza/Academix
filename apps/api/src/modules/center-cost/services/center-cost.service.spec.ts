import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  DeductionScope,
  DeductionType,
  UserRole,
} from '../../../generated/prisma/enums';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { CenterCostScopeFilter } from '../dto/query-center-cost.dto';
import { CenterCostService } from './center-cost.service';

describe('CenterCostService', () => {
  const centerCostCreate = jest.fn<Promise<unknown>, [unknown]>();
  const centerCostFindMany = jest.fn<Promise<unknown>, [unknown]>();
  const centerCostFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const centerCostUpdate = jest.fn<Promise<unknown>, [unknown]>();
  const userFindFirst = jest.fn<Promise<unknown>, [unknown]>();

  const prismaService = {
    centerCost: {
      create: centerCostCreate,
      findMany: centerCostFindMany,
      findFirst: centerCostFindFirst,
      update: centerCostUpdate,
    },
    user: {
      findFirst: userFindFirst,
    },
  };

  let service: CenterCostService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CenterCostService(prismaService as unknown as PrismaService);
  });

  it('creates a global center-cost rule when teacher_id is omitted', async () => {
    centerCostCreate.mockResolvedValueOnce({
      id: 'cost-1',
      centerId: 'center-1',
      teacherId: null,
      name: 'Center Commission',
      deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.GLOBAL,
      value: 12.5,
      isActive: true,
      createdAt: new Date('2026-04-12T18:00:00.000Z'),
      teacher: null,
    });

    const result = await service.create('center-1', {
      name: 'Center Commission',
      deduction_type: DeductionType.PERCENTAGE_OF_TOTAL,
      value: 12.5,
    });

    expect(result).toEqual({
      id: 'cost-1',
      center_id: 'center-1',
      teacher_id: null,
      teacherName: null,
      name: 'Center Commission',
      deduction_type: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.GLOBAL,
      value: 12.5,
      is_active: true,
      created_at: '2026-04-12T18:00:00.000Z',
    });
    expect(userFindFirst).not.toHaveBeenCalled();
    expect(centerCostCreate).toHaveBeenCalledWith({
      data: {
        centerId: 'center-1',
        teacherId: null,
        name: 'Center Commission',
        deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
        scope: DeductionScope.GLOBAL,
        value: 12.5,
      },
      select: {
        id: true,
        centerId: true,
        teacherId: true,
        name: true,
        deductionType: true,
        scope: true,
        value: true,
        isActive: true,
        createdAt: true,
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  });

  it('creates a per-teacher center-cost rule when teacher_id is provided', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      firstName: 'Yara',
      lastName: 'Tahiri',
    });
    centerCostCreate.mockResolvedValueOnce({
      id: 'cost-2',
      centerId: 'center-1',
      teacherId: 'teacher-1',
      name: 'Teacher Override',
      deductionType: DeductionType.FIXED_PER_STUDENT,
      scope: DeductionScope.PER_TEACHER,
      value: 30,
      isActive: true,
      createdAt: new Date('2026-04-12T18:30:00.000Z'),
      teacher: {
        firstName: 'Yara',
        lastName: 'Tahiri',
      },
    });

    const result = await service.create('center-1', {
      teacher_id: 'teacher-1',
      name: 'Teacher Override',
      deduction_type: DeductionType.FIXED_PER_STUDENT,
      value: 30,
    });

    expect(result.scope).toBe(DeductionScope.PER_TEACHER);
    expect(result.teacher_id).toBe('teacher-1');
    expect(result.teacherName).toBe('Yara Tahiri');
    expect(userFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'teacher-1',
        centerId: 'center-1',
        role: UserRole.TEACHER,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });
  });

  it('throws when a teacher-specific rule references a missing teacher', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.create('center-1', {
        teacher_id: 'teacher-1',
        name: 'Teacher Override',
        deduction_type: DeductionType.PERCENTAGE_PER_STUDENT,
        value: 15,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(centerCostCreate).not.toHaveBeenCalled();
  });

  it('rejects percentage-based values above 100', async () => {
    await expect(
      service.create('center-1', {
        name: 'Invalid Percentage',
        deduction_type: DeductionType.PERCENTAGE_OF_TOTAL,
        value: 120,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(centerCostCreate).not.toHaveBeenCalled();
  });

  it('allows zero for percentage-based deductions', async () => {
    centerCostCreate.mockResolvedValueOnce({
      id: 'cost-3',
      centerId: 'center-1',
      teacherId: null,
      name: 'Zero Percentage',
      deductionType: DeductionType.PERCENTAGE_PER_STUDENT,
      scope: DeductionScope.GLOBAL,
      value: 0,
      isActive: true,
      createdAt: new Date('2026-04-12T19:00:00.000Z'),
      teacher: null,
    });

    const result = await service.create('center-1', {
      name: 'Zero Percentage',
      deduction_type: DeductionType.PERCENTAGE_PER_STUDENT,
      value: 0,
    });

    expect(result.value).toBe(0);
  });

  it('rejects fixed deductions when value is not greater than 0', async () => {
    await expect(
      service.create('center-1', {
        name: 'Invalid Fixed Rule',
        deduction_type: DeductionType.FIXED_PER_STUDENT,
        value: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(centerCostCreate).not.toHaveBeenCalled();
  });

  it('lists all center-cost rules by default', async () => {
    centerCostFindMany.mockResolvedValueOnce([
      {
        id: 'cost-1',
        centerId: 'center-1',
        teacherId: null,
        name: 'Center Commission',
        deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
        scope: DeductionScope.GLOBAL,
        value: 12.5,
        isActive: true,
        createdAt: new Date('2026-04-12T19:10:00.000Z'),
        teacher: null,
      },
    ]);

    const result = await service.findAll('center-1', {});

    expect(result).toEqual([
      {
        id: 'cost-1',
        center_id: 'center-1',
        teacher_id: null,
        teacherName: null,
        name: 'Center Commission',
        deduction_type: DeductionType.PERCENTAGE_OF_TOTAL,
        scope: DeductionScope.GLOBAL,
        value: 12.5,
        is_active: true,
        created_at: '2026-04-12T19:10:00.000Z',
      },
    ]);
    expect(centerCostFindMany).toHaveBeenCalledWith({
      where: {
        centerId: 'center-1',
      },
      orderBy: [{ scope: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      skip: 0,
      take: 20,
      select: {
        id: true,
        centerId: true,
        teacherId: true,
        name: true,
        deductionType: true,
        scope: true,
        value: true,
        isActive: true,
        createdAt: true,
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  });

  it('filters center-cost rules to global-only scope', async () => {
    centerCostFindMany.mockResolvedValueOnce([]);

    await service.findAll('center-1', {
      scope: CenterCostScopeFilter.GLOBAL,
      page: 2,
      limit: 10,
    });

    expect(centerCostFindMany).toHaveBeenCalledWith({
      where: {
        centerId: 'center-1',
        scope: DeductionScope.GLOBAL,
      },
      orderBy: [{ scope: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      skip: 10,
      take: 10,
      select: {
        id: true,
        centerId: true,
        teacherId: true,
        name: true,
        deductionType: true,
        scope: true,
        value: true,
        isActive: true,
        createdAt: true,
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  });

  it('filters center-cost rules to per-teacher scope', async () => {
    centerCostFindMany.mockResolvedValueOnce([]);

    await service.findAll('center-1', {
      scope: CenterCostScopeFilter.PER_TEACHER,
    });

    expect(centerCostFindMany).toHaveBeenCalledWith({
      where: {
        centerId: 'center-1',
        scope: DeductionScope.PER_TEACHER,
      },
      orderBy: [{ scope: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      skip: 0,
      take: 20,
      select: {
        id: true,
        centerId: true,
        teacherId: true,
        name: true,
        deductionType: true,
        scope: true,
        value: true,
        isActive: true,
        createdAt: true,
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  });

  it('updates center-cost fields inside the current center scope', async () => {
    centerCostFindFirst.mockResolvedValueOnce({
      id: 'cost-1',
      centerId: 'center-1',
      teacherId: null,
      name: 'Center Commission',
      deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.GLOBAL,
      value: 12.5,
      isActive: true,
      createdAt: new Date('2026-04-12T19:20:00.000Z'),
      teacher: null,
    });
    centerCostUpdate.mockResolvedValueOnce({
      id: 'cost-1',
      centerId: 'center-1',
      teacherId: null,
      name: 'Updated Commission',
      deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.GLOBAL,
      value: 15,
      isActive: true,
      createdAt: new Date('2026-04-12T19:20:00.000Z'),
      teacher: null,
    });

    const result = await service.update('center-1', 'cost-1', {
      name: 'Updated Commission',
      value: 15,
    });

    expect(result).toEqual({
      id: 'cost-1',
      center_id: 'center-1',
      teacher_id: null,
      teacherName: null,
      name: 'Updated Commission',
      deduction_type: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.GLOBAL,
      value: 15,
      is_active: true,
      created_at: '2026-04-12T19:20:00.000Z',
    });
    expect(centerCostUpdate).toHaveBeenCalledWith({
      where: {
        id: 'cost-1',
      },
      data: {
        name: 'Updated Commission',
        value: 15,
      },
      select: {
        id: true,
        centerId: true,
        teacherId: true,
        name: true,
        deductionType: true,
        scope: true,
        value: true,
        isActive: true,
        createdAt: true,
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  });

  it('switches a global rule to per-teacher scope when teacher_id is set', async () => {
    centerCostFindFirst.mockResolvedValueOnce({
      id: 'cost-2',
      centerId: 'center-1',
      teacherId: null,
      name: 'Teacher Cost',
      deductionType: DeductionType.FIXED_PER_STUDENT,
      scope: DeductionScope.GLOBAL,
      value: 20,
      isActive: true,
      createdAt: new Date('2026-04-12T19:30:00.000Z'),
      teacher: null,
    });
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      firstName: 'Yara',
      lastName: 'Tahiri',
    });
    centerCostUpdate.mockResolvedValueOnce({
      id: 'cost-2',
      centerId: 'center-1',
      teacherId: 'teacher-1',
      name: 'Teacher Cost',
      deductionType: DeductionType.FIXED_PER_STUDENT,
      scope: DeductionScope.PER_TEACHER,
      value: 20,
      isActive: true,
      createdAt: new Date('2026-04-12T19:30:00.000Z'),
      teacher: {
        firstName: 'Yara',
        lastName: 'Tahiri',
      },
    });

    const result = await service.update('center-1', 'cost-2', {
      teacher_id: 'teacher-1',
    });

    expect(result.scope).toBe(DeductionScope.PER_TEACHER);
    expect(result.teacher_id).toBe('teacher-1');
    expect(centerCostUpdate).toHaveBeenCalledWith({
      where: {
        id: 'cost-2',
      },
      data: {
        teacherId: 'teacher-1',
        scope: DeductionScope.PER_TEACHER,
      },
      select: {
        id: true,
        centerId: true,
        teacherId: true,
        name: true,
        deductionType: true,
        scope: true,
        value: true,
        isActive: true,
        createdAt: true,
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  });

  it('switches a per-teacher rule back to global when teacher_id is cleared', async () => {
    centerCostFindFirst.mockResolvedValueOnce({
      id: 'cost-3',
      centerId: 'center-1',
      teacherId: 'teacher-1',
      name: 'Teacher Override',
      deductionType: DeductionType.PERCENTAGE_PER_STUDENT,
      scope: DeductionScope.PER_TEACHER,
      value: 10,
      isActive: true,
      createdAt: new Date('2026-04-12T19:40:00.000Z'),
      teacher: {
        firstName: 'Yara',
        lastName: 'Tahiri',
      },
    });
    centerCostUpdate.mockResolvedValueOnce({
      id: 'cost-3',
      centerId: 'center-1',
      teacherId: null,
      name: 'Teacher Override',
      deductionType: DeductionType.PERCENTAGE_PER_STUDENT,
      scope: DeductionScope.GLOBAL,
      value: 10,
      isActive: true,
      createdAt: new Date('2026-04-12T19:40:00.000Z'),
      teacher: null,
    });

    const result = await service.update('center-1', 'cost-3', {
      teacher_id: null,
    });

    expect(result.scope).toBe(DeductionScope.GLOBAL);
    expect(result.teacher_id).toBeNull();
    expect(centerCostUpdate).toHaveBeenCalledWith({
      where: {
        id: 'cost-3',
      },
      data: {
        teacherId: null,
        scope: DeductionScope.GLOBAL,
      },
      select: {
        id: true,
        centerId: true,
        teacherId: true,
        name: true,
        deductionType: true,
        scope: true,
        value: true,
        isActive: true,
        createdAt: true,
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  });

  it('rejects update when the effective deduction type and value are invalid', async () => {
    centerCostFindFirst.mockResolvedValueOnce({
      id: 'cost-4',
      centerId: 'center-1',
      teacherId: null,
      name: 'Fixed Rule',
      deductionType: DeductionType.FIXED_PER_STUDENT,
      scope: DeductionScope.GLOBAL,
      value: 30,
      isActive: true,
      createdAt: new Date('2026-04-12T19:50:00.000Z'),
      teacher: null,
    });

    await expect(
      service.update('center-1', 'cost-4', {
        value: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(centerCostUpdate).not.toHaveBeenCalled();
  });

  it('returns the existing center-cost rule when update payload is empty', async () => {
    centerCostFindFirst.mockResolvedValueOnce({
      id: 'cost-5',
      centerId: 'center-1',
      teacherId: null,
      name: 'Current Rule',
      deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.GLOBAL,
      value: 8,
      isActive: true,
      createdAt: new Date('2026-04-12T20:00:00.000Z'),
      teacher: null,
    });

    const result = await service.update('center-1', 'cost-5', {});

    expect(result).toEqual({
      id: 'cost-5',
      center_id: 'center-1',
      teacher_id: null,
      teacherName: null,
      name: 'Current Rule',
      deduction_type: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.GLOBAL,
      value: 8,
      is_active: true,
      created_at: '2026-04-12T20:00:00.000Z',
    });
    expect(centerCostUpdate).not.toHaveBeenCalled();
  });

  it('throws when updating a center-cost rule outside the current center scope', async () => {
    centerCostFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.update('center-1', 'missing-cost', {}),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(centerCostUpdate).not.toHaveBeenCalled();
  });

  it('toggles an active center-cost rule to inactive', async () => {
    centerCostFindFirst.mockResolvedValueOnce({
      id: 'cost-6',
      centerId: 'center-1',
      teacherId: null,
      name: 'Rule To Disable',
      deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.GLOBAL,
      value: 9,
      isActive: true,
      createdAt: new Date('2026-04-12T20:10:00.000Z'),
      teacher: null,
    });
    centerCostUpdate.mockResolvedValueOnce({
      id: 'cost-6',
      centerId: 'center-1',
      teacherId: null,
      name: 'Rule To Disable',
      deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.GLOBAL,
      value: 9,
      isActive: false,
      createdAt: new Date('2026-04-12T20:10:00.000Z'),
      teacher: null,
    });

    const result = await service.toggleActive('center-1', 'cost-6');

    expect(result).toEqual({
      id: 'cost-6',
      center_id: 'center-1',
      teacher_id: null,
      teacherName: null,
      name: 'Rule To Disable',
      deduction_type: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.GLOBAL,
      value: 9,
      is_active: false,
      created_at: '2026-04-12T20:10:00.000Z',
    });
    expect(centerCostUpdate).toHaveBeenCalledWith({
      where: {
        id: 'cost-6',
      },
      data: {
        isActive: false,
      },
      select: {
        id: true,
        centerId: true,
        teacherId: true,
        name: true,
        deductionType: true,
        scope: true,
        value: true,
        isActive: true,
        createdAt: true,
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  });

  it('toggles an inactive center-cost rule back to active', async () => {
    centerCostFindFirst.mockResolvedValueOnce({
      id: 'cost-7',
      centerId: 'center-1',
      teacherId: 'teacher-1',
      name: 'Rule To Enable',
      deductionType: DeductionType.FIXED_PER_STUDENT,
      scope: DeductionScope.PER_TEACHER,
      value: 22,
      isActive: false,
      createdAt: new Date('2026-04-12T20:20:00.000Z'),
      teacher: {
        firstName: 'Yara',
        lastName: 'Tahiri',
      },
    });
    centerCostUpdate.mockResolvedValueOnce({
      id: 'cost-7',
      centerId: 'center-1',
      teacherId: 'teacher-1',
      name: 'Rule To Enable',
      deductionType: DeductionType.FIXED_PER_STUDENT,
      scope: DeductionScope.PER_TEACHER,
      value: 22,
      isActive: true,
      createdAt: new Date('2026-04-12T20:20:00.000Z'),
      teacher: {
        firstName: 'Yara',
        lastName: 'Tahiri',
      },
    });

    const result = await service.toggleActive('center-1', 'cost-7');

    expect(result.is_active).toBe(true);
    expect(result.teacherName).toBe('Yara Tahiri');
    expect(centerCostUpdate).toHaveBeenCalledWith({
      where: {
        id: 'cost-7',
      },
      data: {
        isActive: true,
      },
      select: {
        id: true,
        centerId: true,
        teacherId: true,
        name: true,
        deductionType: true,
        scope: true,
        value: true,
        isActive: true,
        createdAt: true,
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  });

  it('throws when toggling a center-cost rule outside the current center scope', async () => {
    centerCostFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.toggleActive('center-1', 'missing-cost'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(centerCostUpdate).not.toHaveBeenCalled();
  });

  it('resolves the teacher-specific cost rule before the global rule of the same deduction type', async () => {
    centerCostFindFirst.mockResolvedValueOnce({
      id: 'cost-8',
      centerId: 'center-1',
      teacherId: 'teacher-1',
      name: 'Teacher Override',
      deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.PER_TEACHER,
      value: 18,
      isActive: true,
      createdAt: new Date('2026-04-13T09:00:00.000Z'),
      teacher: {
        firstName: 'Yara',
        lastName: 'Tahiri',
      },
    });

    const result = await service.resolveApplicableCost(
      'center-1',
      DeductionType.PERCENTAGE_OF_TOTAL,
      'teacher-1',
    );

    expect(result).toEqual({
      id: 'cost-8',
      center_id: 'center-1',
      teacher_id: 'teacher-1',
      teacherName: 'Yara Tahiri',
      name: 'Teacher Override',
      deduction_type: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.PER_TEACHER,
      value: 18,
      is_active: true,
      created_at: '2026-04-13T09:00:00.000Z',
    });
    expect(centerCostFindFirst).toHaveBeenNthCalledWith(1, {
      where: {
        centerId: 'center-1',
        deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
        scope: DeductionScope.PER_TEACHER,
        teacherId: 'teacher-1',
        isActive: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        centerId: true,
        teacherId: true,
        name: true,
        deductionType: true,
        scope: true,
        value: true,
        isActive: true,
        createdAt: true,
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    expect(centerCostFindFirst).toHaveBeenCalledTimes(1);
  });

  it('falls back to the global cost rule when no teacher-specific override exists', async () => {
    centerCostFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'cost-9',
      centerId: 'center-1',
      teacherId: null,
      name: 'Global Rule',
      deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.GLOBAL,
      value: 12,
      isActive: true,
      createdAt: new Date('2026-04-13T09:15:00.000Z'),
      teacher: null,
    });

    const result = await service.resolveApplicableCost(
      'center-1',
      DeductionType.PERCENTAGE_OF_TOTAL,
      'teacher-1',
    );

    expect(result?.id).toBe('cost-9');
    expect(result?.scope).toBe(DeductionScope.GLOBAL);
    expect(centerCostFindFirst).toHaveBeenNthCalledWith(2, {
      where: {
        centerId: 'center-1',
        deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
        scope: DeductionScope.GLOBAL,
        teacherId: null,
        isActive: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        centerId: true,
        teacherId: true,
        name: true,
        deductionType: true,
        scope: true,
        value: true,
        isActive: true,
        createdAt: true,
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  });

  it('ignores inactive teacher overrides and resolves the active global rule instead', async () => {
    centerCostFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'cost-10',
      centerId: 'center-1',
      teacherId: null,
      name: 'Fallback Global',
      deductionType: DeductionType.FIXED_PER_STUDENT,
      scope: DeductionScope.GLOBAL,
      value: 25,
      isActive: true,
      createdAt: new Date('2026-04-13T09:30:00.000Z'),
      teacher: null,
    });

    const result = await service.resolveApplicableCost(
      'center-1',
      DeductionType.FIXED_PER_STUDENT,
      'teacher-2',
    );

    expect(result?.id).toBe('cost-10');
    expect(result?.teacher_id).toBeNull();
    expect(centerCostFindFirst).toHaveBeenCalledTimes(2);
  });

  it('returns the active global rule directly when no teacher id is provided', async () => {
    centerCostFindFirst.mockResolvedValueOnce({
      id: 'cost-11',
      centerId: 'center-1',
      teacherId: null,
      name: 'Global Only',
      deductionType: DeductionType.PERCENTAGE_PER_STUDENT,
      scope: DeductionScope.GLOBAL,
      value: 7.5,
      isActive: true,
      createdAt: new Date('2026-04-13T09:45:00.000Z'),
      teacher: null,
    });

    const result = await service.resolveApplicableCost(
      'center-1',
      DeductionType.PERCENTAGE_PER_STUDENT,
    );

    expect(result).toEqual({
      id: 'cost-11',
      center_id: 'center-1',
      teacher_id: null,
      teacherName: null,
      name: 'Global Only',
      deduction_type: DeductionType.PERCENTAGE_PER_STUDENT,
      scope: DeductionScope.GLOBAL,
      value: 7.5,
      is_active: true,
      created_at: '2026-04-13T09:45:00.000Z',
    });
    expect(centerCostFindFirst).toHaveBeenCalledTimes(1);
  });

  it('returns null when no active matching cost rule exists', async () => {
    centerCostFindFirst.mockResolvedValueOnce(null);

    const result = await service.resolveApplicableCost(
      'center-1',
      DeductionType.FIXED_PER_STUDENT,
    );

    expect(result).toBeNull();
  });

  it('returns center-cost module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'center-cost',
      status: 'ready',
    });
  });
});
