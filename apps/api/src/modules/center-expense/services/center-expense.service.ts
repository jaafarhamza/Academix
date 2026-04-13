import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateCenterExpenseDto } from '../dto/create-center-expense.dto';
import { CenterExpenseResponseDto } from '../dto/center-expense-response.dto';
import { QueryCenterExpenseDto } from '../dto/query-center-expense.dto';
import { CenterExpenseStatusResponseDto } from '../dto/center-expense-status-response.dto';
import { UpdateCenterExpenseDto } from '../dto/update-center-expense.dto';

@Injectable()
export class CenterExpenseService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    centerId: string,
    payload: CreateCenterExpenseDto,
  ): Promise<CenterExpenseResponseDto> {
    const user = await this.findExpenseUserOrThrow(centerId, payload.user_id);

    const centerExpense = await this.prismaService.centerExpense.create({
      data: {
        centerId,
        userId: user.id,
        amount: payload.amount,
        description: payload.description,
        date: this.toExpenseDate(payload.date),
      },
      select: this.getCenterExpenseSelect(),
    });

    return this.toCenterExpenseResponse(centerExpense);
  }

  async findAll(
    centerId: string,
    query: QueryCenterExpenseDto,
  ): Promise<CenterExpenseResponseDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const centerExpenses = await this.prismaService.centerExpense.findMany({
      where: {
        centerId,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit,
      select: this.getCenterExpenseSelect(),
    });

    return centerExpenses.map((centerExpense) =>
      this.toCenterExpenseResponse(centerExpense),
    );
  }

  async update(
    centerId: string,
    id: string,
    payload: UpdateCenterExpenseDto,
  ): Promise<CenterExpenseResponseDto> {
    const existingCenterExpense = await this.findCenterExpenseOrThrow(
      centerId,
      id,
    );
    const user =
      payload.user_id === undefined
        ? undefined
        : await this.findExpenseUserOrThrow(centerId, payload.user_id);
    const data = this.buildCenterExpenseUpdateData(payload, user);

    if (Object.keys(data).length === 0) {
      return this.toCenterExpenseResponse(existingCenterExpense);
    }

    const centerExpense = await this.prismaService.centerExpense.update({
      where: {
        id,
      },
      data,
      select: this.getCenterExpenseSelect(),
    });

    return this.toCenterExpenseResponse(centerExpense);
  }

  async remove(centerId: string, id: string): Promise<void> {
    await this.findCenterExpenseStateOrThrow(centerId, id);

    await this.prismaService.centerExpense.delete({
      where: {
        id,
      },
    });
  }

  getStatus(): CenterExpenseStatusResponseDto {
    return {
      module: 'center-expense',
      status: 'ready',
    };
  }

  private async findExpenseUserOrThrow(centerId: string, userId: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        id: userId,
        centerId,
        role: {
          in: [UserRole.TEACHER, UserRole.SECRETARY],
        },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Expense user not found');
    }

    return user;
  }

  private async findCenterExpenseOrThrow(centerId: string, id: string) {
    const centerExpense = await this.prismaService.centerExpense.findFirst({
      where: {
        id,
        centerId,
      },
      select: this.getCenterExpenseSelect(),
    });

    if (!centerExpense) {
      throw new NotFoundException('Center expense not found');
    }

    return centerExpense;
  }

  private async findCenterExpenseStateOrThrow(centerId: string, id: string) {
    const centerExpense = await this.prismaService.centerExpense.findFirst({
      where: {
        id,
        centerId,
      },
      select: {
        id: true,
      },
    });

    if (!centerExpense) {
      throw new NotFoundException('Center expense not found');
    }

    return centerExpense;
  }

  private buildCenterExpenseUpdateData(
    payload: UpdateCenterExpenseDto,
    user:
      | {
          id: string;
        }
      | undefined,
  ) {
    const data: {
      userId?: string;
      amount?: number;
      description?: string;
      date?: Date;
    } = {};

    if (payload.user_id !== undefined) {
      if (!user) {
        throw new NotFoundException('Expense user not found');
      }

      data.userId = user.id;
    }
    if (payload.amount !== undefined) {
      data.amount = payload.amount;
    }
    if (payload.description !== undefined) {
      data.description = payload.description;
    }
    if (payload.date !== undefined) {
      data.date = this.toExpenseDate(payload.date);
    }

    return data;
  }

  private getCenterExpenseSelect() {
    return {
      id: true,
      centerId: true,
      userId: true,
      amount: true,
      description: true,
      date: true,
      createdAt: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    };
  }

  private toCenterExpenseResponse(centerExpense: {
    id: string;
    centerId: string;
    userId: string;
    amount: number | string | { toNumber(): number };
    description: string;
    date: Date;
    createdAt: Date;
    user: {
      firstName: string;
      lastName: string;
      role: UserRole;
    };
  }): CenterExpenseResponseDto {
    return {
      id: centerExpense.id,
      center_id: centerExpense.centerId,
      user_id: centerExpense.userId,
      userName:
        `${centerExpense.user.firstName} ${centerExpense.user.lastName}`.trim(),
      userRole: centerExpense.user.role,
      amount: this.toNumber(centerExpense.amount),
      description: centerExpense.description,
      date: centerExpense.date.toISOString().slice(0, 10),
      created_at: centerExpense.createdAt.toISOString(),
    };
  }

  private toExpenseDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
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
