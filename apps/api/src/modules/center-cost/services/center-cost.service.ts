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

@Injectable()
export class CenterCostService {
  constructor(private readonly prismaService: PrismaService) {}

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
      value > 100
    ) {
      throw new BadRequestException(
        'percentage deduction value must be less than or equal to 100',
      );
    }
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
