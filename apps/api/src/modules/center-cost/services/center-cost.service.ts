import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeductionScope,
  DeductionType,
  UserRole,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateCenterCostDto } from '../dto/create-center-cost.dto';
import { CenterCostResponseDto } from '../dto/center-cost-response.dto';
import { CenterCostStatusResponseDto } from '../dto/center-cost-status-response.dto';
import {
  CenterCostScopeFilter,
  QueryCenterCostDto,
} from '../dto/query-center-cost.dto';
import { UpdateCenterCostDto } from '../dto/update-center-cost.dto';

@Injectable()
export class CenterCostService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(
    centerId: string,
    query: QueryCenterCostDto,
  ): Promise<CenterCostResponseDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const scope = query.scope ?? CenterCostScopeFilter.ALL;

    const centerCosts = await this.prismaService.centerCost.findMany({
      where: {
        centerId,
        ...(scope === CenterCostScopeFilter.GLOBAL
          ? { scope: DeductionScope.GLOBAL }
          : {}),
        ...(scope === CenterCostScopeFilter.PER_TEACHER
          ? { scope: DeductionScope.PER_TEACHER }
          : {}),
      },
      orderBy: [{ scope: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      skip,
      take: limit,
      select: this.getCenterCostSelect(),
    });

    return centerCosts.map((centerCost) =>
      this.toCenterCostResponse(centerCost),
    );
  }

  async create(
    centerId: string,
    payload: CreateCenterCostDto,
  ): Promise<CenterCostResponseDto> {
    this.validateDeductionValue(payload.deduction_type, payload.value);

    const teacher = payload.teacher_id
      ? await this.prismaService.user.findFirst({
          where: {
            id: payload.teacher_id,
            centerId,
            role: UserRole.TEACHER,
            isActive: true,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        })
      : null;

    if (payload.teacher_id && !teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const centerCost = await this.prismaService.centerCost.create({
      data: {
        centerId,
        teacherId: teacher?.id ?? null,
        name: payload.name,
        deductionType: payload.deduction_type,
        scope: teacher ? DeductionScope.PER_TEACHER : DeductionScope.GLOBAL,
        value: payload.value,
      },
      select: this.getCenterCostSelect(),
    });

    return this.toCenterCostResponse(centerCost);
  }

  async update(
    centerId: string,
    id: string,
    payload: UpdateCenterCostDto,
  ): Promise<CenterCostResponseDto> {
    const existingCenterCost = await this.findCenterCostOrThrow(centerId, id);
    const nextDeductionType =
      payload.deduction_type ?? existingCenterCost.deductionType;
    const nextValue = payload.value ?? this.toNumber(existingCenterCost.value);

    this.validateDeductionValue(nextDeductionType, nextValue);

    const teacher =
      payload.teacher_id === undefined
        ? undefined
        : payload.teacher_id === null
          ? null
          : await this.findTeacherOrThrow(centerId, payload.teacher_id);

    const data = this.buildCenterCostUpdateData(payload, teacher);

    if (Object.keys(data).length === 0) {
      return this.toCenterCostResponse(existingCenterCost);
    }

    const centerCost = await this.prismaService.centerCost.update({
      where: {
        id,
      },
      data,
      select: this.getCenterCostSelect(),
    });

    return this.toCenterCostResponse(centerCost);
  }

  async toggleActive(
    centerId: string,
    id: string,
  ): Promise<CenterCostResponseDto> {
    const existingCenterCost = await this.findCenterCostOrThrow(centerId, id);

    const centerCost = await this.prismaService.centerCost.update({
      where: {
        id,
      },
      data: {
        isActive: !existingCenterCost.isActive,
      },
      select: this.getCenterCostSelect(),
    });

    return this.toCenterCostResponse(centerCost);
  }

  async resolveApplicableCost(
    centerId: string,
    deductionType: DeductionType,
    teacherId?: string | null,
  ): Promise<CenterCostResponseDto | null> {
    if (teacherId) {
      const teacherSpecificCost = await this.findMatchingActiveCenterCost({
        centerId,
        deductionType,
        scope: DeductionScope.PER_TEACHER,
        teacherId,
      });

      if (teacherSpecificCost) {
        return this.toCenterCostResponse(teacherSpecificCost);
      }
    }

    const globalCost = await this.findMatchingActiveCenterCost({
      centerId,
      deductionType,
      scope: DeductionScope.GLOBAL,
      teacherId: null,
    });

    return globalCost ? this.toCenterCostResponse(globalCost) : null;
  }

  getStatus(): CenterCostStatusResponseDto {
    return {
      module: 'center-cost',
      status: 'ready',
    };
  }

  private validateDeductionValue(
    deductionType: DeductionType,
    value: number,
  ): void {
    if (
      (deductionType === DeductionType.PERCENTAGE_OF_TOTAL ||
        deductionType === DeductionType.PERCENTAGE_PER_STUDENT) &&
      (value < 0 || value > 100)
    ) {
      throw new BadRequestException(
        'percentage deduction value must be between 0 and 100',
      );
    }

    if (deductionType === DeductionType.FIXED_PER_STUDENT && value <= 0) {
      throw new BadRequestException(
        'fixed deduction value must be greater than 0',
      );
    }
  }

  private async findCenterCostOrThrow(centerId: string, id: string) {
    const centerCost = await this.prismaService.centerCost.findFirst({
      where: {
        id,
        centerId,
      },
      select: this.getCenterCostSelect(),
    });

    if (!centerCost) {
      throw new NotFoundException('Center cost rule not found');
    }

    return centerCost;
  }

  private async findTeacherOrThrow(centerId: string, teacherId: string) {
    const teacher = await this.prismaService.user.findFirst({
      where: {
        id: teacherId,
        centerId,
        role: UserRole.TEACHER,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  private async findMatchingActiveCenterCost(params: {
    centerId: string;
    deductionType: DeductionType;
    scope: DeductionScope;
    teacherId: string | null;
  }) {
    return this.prismaService.centerCost.findFirst({
      where: {
        centerId: params.centerId,
        deductionType: params.deductionType,
        scope: params.scope,
        teacherId: params.teacherId,
        isActive: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: this.getCenterCostSelect(),
    });
  }

  private buildCenterCostUpdateData(
    payload: UpdateCenterCostDto,
    teacher:
      | {
          id: string;
        }
      | null
      | undefined,
  ) {
    const data: {
      teacherId?: string | null;
      name?: string;
      deductionType?: DeductionType;
      scope?: DeductionScope;
      value?: number;
    } = {};

    if (payload.teacher_id !== undefined) {
      data.teacherId = teacher?.id ?? null;
      data.scope = teacher ? DeductionScope.PER_TEACHER : DeductionScope.GLOBAL;
    }
    if (payload.name !== undefined) {
      data.name = payload.name;
    }
    if (payload.deduction_type !== undefined) {
      data.deductionType = payload.deduction_type;
    }
    if (payload.value !== undefined) {
      data.value = payload.value;
    }

    return data;
  }

  private getCenterCostSelect() {
    return {
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
    };
  }

  private toCenterCostResponse(centerCost: {
    id: string;
    centerId: string;
    teacherId: string | null;
    name: string;
    deductionType: DeductionType;
    scope: DeductionScope;
    value: number | string | { toNumber(): number };
    isActive: boolean;
    createdAt: Date;
    teacher: {
      firstName: string;
      lastName: string;
    } | null;
  }): CenterCostResponseDto {
    return {
      id: centerCost.id,
      center_id: centerCost.centerId,
      teacher_id: centerCost.teacherId,
      teacherName: centerCost.teacher
        ? `${centerCost.teacher.firstName} ${centerCost.teacher.lastName}`
        : null,
      name: centerCost.name,
      deduction_type: centerCost.deductionType,
      scope: centerCost.scope,
      value: this.toNumber(centerCost.value),
      is_active: centerCost.isActive,
      created_at: centerCost.createdAt.toISOString(),
    };
  }

  private toNumber(value: number | string | { toNumber(): number }): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      return Number(value);
    }

    return value.toNumber();
  }
}
