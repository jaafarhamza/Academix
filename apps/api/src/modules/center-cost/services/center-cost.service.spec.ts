import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  DeductionScope,
  DeductionType,
  UserRole,
} from '../../../generated/prisma/enums';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { CenterCostService } from './center-cost.service';

describe('CenterCostService', () => {
  const centerCostCreate = jest.fn<Promise<unknown>, [unknown]>();
  const userFindFirst = jest.fn<Promise<unknown>, [unknown]>();

  const prismaService = {
    centerCost: {
      create: centerCostCreate,
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

  it('returns center-cost module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'center-cost',
      status: 'ready',
    });
  });
});
