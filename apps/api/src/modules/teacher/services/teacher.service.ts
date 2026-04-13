import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DayOfWeek,
  DeductionType,
  SessionStatus,
  UserRole,
} from '../../../generated/prisma/enums';
import { hashPassword } from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CenterCostService } from '../../center-cost/services/center-cost.service';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { QueryTeacherDto } from '../dto/query-teacher.dto';
import {
  TeacherDetailResponseDto,
  TeacherSubjectSummaryDto,
} from '../dto/teacher-detail-response.dto';
import { TeacherHoursPeriod } from '../dto/teacher-hours-query.dto';
import { TeacherHoursResponseDto } from '../dto/teacher-hours-response.dto';
import { TeacherMonthlyIncomeResponseDto } from '../dto/teacher-monthly-income-response.dto';
import { TeacherStatusResponseDto } from '../dto/teacher-status-response.dto';
import { TeacherResponseDto } from '../dto/teacher-response.dto';
import { UpdateTeacherDto } from '../dto/update-teacher.dto';

const DAY_OF_WEEK_TO_JS_DAY: Record<DayOfWeek, number> = {
  [DayOfWeek.MONDAY]: 1,
  [DayOfWeek.TUESDAY]: 2,
  [DayOfWeek.WEDNESDAY]: 3,
  [DayOfWeek.THURSDAY]: 4,
  [DayOfWeek.FRIDAY]: 5,
  [DayOfWeek.SATURDAY]: 6,
  [DayOfWeek.SUNDAY]: 0,
};

@Injectable()
export class TeacherService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly centerCostService: CenterCostService,
  ) {}

  async create(
    centerId: string,
    payload: CreateTeacherDto,
  ): Promise<TeacherResponseDto> {
    const passwordHash = await hashPassword(payload.password);
    try {
      const teacher = await this.prismaService.user.create({
        data: {
          centerId,
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          passwordHash,
          phone: payload.phone,
          role: UserRole.TEACHER,
          cin: payload.cin,
          hourlyRate: payload.hourlyRate ?? null,
          maxHoursPerWeek: payload.maxHoursPerWeek ?? null,
        },
        select: {
          id: true,
          centerId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          cin: true,
          isActive: true,
          createdAt: true,
        },
      });

      return this.toTeacherResponse(teacher);
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const target = this.getUniqueConstraintTarget(error);
      if (target.includes('email')) {
        throw new ConflictException('Teacher email already in use');
      }
      if (target.includes('cin')) {
        throw new ConflictException('Teacher CIN already in use');
      }

      throw new ConflictException(
        'Teacher already exists with the provided unique fields',
      );
    }
  }

  async findAll(
    centerId: string,
    query: QueryTeacherDto,
  ): Promise<TeacherResponseDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const teachers = await this.prismaService.user.findMany({
      where: {
        centerId,
        role: UserRole.TEACHER,
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.search
          ? {
              OR: [
                {
                  firstName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  cin: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: limit,
      select: {
        id: true,
        centerId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        cin: true,
        isActive: true,
        createdAt: true,
      },
    });

    return teachers.map((teacher) => this.toTeacherResponse(teacher));
  }

  async findOne(
    centerId: string,
    id: string,
  ): Promise<TeacherDetailResponseDto> {
    const teacher = await this.findTeacherDetailRecordOrThrow(centerId, id);
    return this.toTeacherDetailResponse(teacher);
  }

  async getHours(
    centerId: string,
    id: string,
    period: TeacherHoursPeriod,
  ): Promise<TeacherHoursResponseDto> {
    const teacher = await this.findTeacherHoursRecordOrThrow(centerId, id);

    if (period === TeacherHoursPeriod.WEEK) {
      return {
        teacher_id: teacher.id,
        center_id: teacher.centerId,
        period,
        hours: this.calculateHoursThisWeek(teacher.teachingSessions),
      };
    }

    if (period === TeacherHoursPeriod.MONTH) {
      return {
        teacher_id: teacher.id,
        center_id: teacher.centerId,
        period,
        hours: this.calculateHoursThisMonth(teacher.teachingSessions),
      };
    }

    throw new BadRequestException('period must be one of: week, month');
  }

  async monthlyIncome(
    centerId: string,
    id: string,
    month: string,
  ): Promise<TeacherMonthlyIncomeResponseDto> {
    await this.findTeacherStateRecordOrThrow(centerId, id);

    const monthRange = this.getMonthDateRange(month);
    const paymentSummary = await this.getTeacherMonthlyPaymentSummary(
      centerId,
      id,
      monthRange,
    );
    const teacherExpenses = await this.prismaService.centerExpense.findMany({
      where: {
        centerId,
        userId: id,
        date: {
          gte: monthRange.start,
          lt: monthRange.end,
        },
      },
      select: {
        amount: true,
      },
    });

    const [
      percentageOfTotalCost,
      percentagePerStudentCost,
      fixedPerStudentCost,
    ] = await Promise.all([
      this.centerCostService.resolveApplicableCost(
        centerId,
        DeductionType.PERCENTAGE_OF_TOTAL,
        id,
      ),
      this.centerCostService.resolveApplicableCost(
        centerId,
        DeductionType.PERCENTAGE_PER_STUDENT,
        id,
      ),
      this.centerCostService.resolveApplicableCost(
        centerId,
        DeductionType.FIXED_PER_STUDENT,
        id,
      ),
    ]);

    const deductionBreakdown = {
      percentage_of_total: percentageOfTotalCost
        ? this.roundToTwoDecimals(
            paymentSummary.collectedPayments *
              (percentageOfTotalCost.value / 100),
          )
        : 0,
      percentage_per_student: percentagePerStudentCost
        ? this.roundToTwoDecimals(
            paymentSummary.collectedPayments *
              (percentagePerStudentCost.value / 100),
          )
        : 0,
      fixed_per_student: fixedPerStudentCost
        ? this.roundToTwoDecimals(
            paymentSummary.paidStudents * fixedPerStudentCost.value,
          )
        : 0,
      total: 0,
    };
    deductionBreakdown.total = this.roundToTwoDecimals(
      deductionBreakdown.percentage_of_total +
        deductionBreakdown.percentage_per_student +
        deductionBreakdown.fixed_per_student,
    );

    const expenses = this.roundToTwoDecimals(
      teacherExpenses.reduce(
        (sum, expense) => sum + this.toNumber(expense.amount),
        0,
      ),
    );
    const netIncome = this.roundToTwoDecimals(
      paymentSummary.collectedPayments - deductionBreakdown.total + expenses,
    );

    return {
      teacher_id: id,
      center_id: centerId,
      month,
      collected_payments: paymentSummary.collectedPayments,
      paid_students: paymentSummary.paidStudents,
      deduction_breakdown: deductionBreakdown,
      expenses,
      net_income: netIncome,
    };
  }

  async update(
    centerId: string,
    id: string,
    payload: UpdateTeacherDto,
  ): Promise<TeacherDetailResponseDto> {
    const existingTeacher = await this.findTeacherDetailRecordOrThrow(
      centerId,
      id,
    );
    const data = this.buildTeacherUpdateData(payload);

    if (Object.keys(data).length === 0) {
      return this.toTeacherDetailResponse(existingTeacher);
    }

    try {
      const teacher = await this.prismaService.user.update({
        where: {
          id,
        },
        data,
        select: this.getTeacherDetailSelect(centerId),
      });

      return this.toTeacherDetailResponse(teacher);
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const target = this.getUniqueConstraintTarget(error);
      if (target.includes('email')) {
        throw new ConflictException('Teacher email already in use');
      }
      if (target.includes('cin')) {
        throw new ConflictException('Teacher CIN already in use');
      }

      throw new ConflictException(
        'Teacher already exists with the provided unique fields',
      );
    }
  }

  async deactivate(centerId: string, id: string): Promise<void> {
    const teacher = await this.findTeacherStateRecordOrThrow(centerId, id);

    if (!teacher.isActive) {
      return;
    }

    await this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  }

  async activate(centerId: string, id: string): Promise<void> {
    const teacher = await this.findTeacherStateRecordOrThrow(centerId, id);

    if (teacher.isActive) {
      return;
    }

    await this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        isActive: true,
      },
    });
  }

  getStatus(): TeacherStatusResponseDto {
    return {
      module: 'teacher',
      status: 'ready',
    };
  }

  private toTeacherResponse(teacher: {
    id: string;
    centerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    cin: string | null;
    isActive: boolean;
    createdAt: Date;
  }): TeacherResponseDto {
    return {
      id: teacher.id,
      center_id: teacher.centerId,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      role: teacher.role,
      cin: teacher.cin,
      isActive: teacher.isActive,
      createdAt: teacher.createdAt,
    };
  }

  private toTeacherDetailResponse(teacher: {
    id: string;
    centerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    cin: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    hourlyRate: DecimalLike | null;
    maxHoursPerWeek: DecimalLike | null;
    teacherSubjects: Array<{
      subject: {
        id: string;
        name: string;
      };
    }>;
    teachingSessions: Array<{
      day: DayOfWeek;
      startTime: Date;
      endTime: Date;
      status: SessionStatus;
    }>;
  }): TeacherDetailResponseDto {
    const subjects = this.toTeacherSubjects(teacher.teacherSubjects);

    return {
      id: teacher.id,
      center_id: teacher.centerId,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      role: teacher.role,
      cin: teacher.cin,
      isActive: teacher.isActive,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
      hourlyRate: this.toNullableNumber(teacher.hourlyRate),
      maxHoursPerWeek: this.toNullableNumber(teacher.maxHoursPerWeek),
      subjects,
      hoursThisWeek: this.calculateHoursThisWeek(teacher.teachingSessions),
      hoursThisMonth: this.calculateHoursThisMonth(teacher.teachingSessions),
    };
  }

  private getTeacherDetailSelect(centerId: string) {
    return {
      id: true,
      centerId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      cin: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      hourlyRate: true,
      maxHoursPerWeek: true,
      teacherSubjects: {
        select: {
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      teachingSessions: {
        where: {
          centerId,
          status: {
            not: SessionStatus.CANCELLED,
          },
        },
        select: {
          day: true,
          startTime: true,
          endTime: true,
          status: true,
        },
      },
    };
  }

  private async findTeacherDetailRecordOrThrow(centerId: string, id: string) {
    const teacher = await this.prismaService.user.findFirst({
      where: {
        id,
        centerId,
        role: UserRole.TEACHER,
      },
      select: this.getTeacherDetailSelect(centerId),
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  private async findTeacherStateRecordOrThrow(centerId: string, id: string) {
    const teacher = await this.prismaService.user.findFirst({
      where: {
        id,
        centerId,
        role: UserRole.TEACHER,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  private async findTeacherHoursRecordOrThrow(centerId: string, id: string) {
    const teacher = await this.prismaService.user.findFirst({
      where: {
        id,
        centerId,
        role: UserRole.TEACHER,
      },
      select: {
        id: true,
        centerId: true,
        teachingSessions: {
          where: {
            centerId,
            status: {
              not: SessionStatus.CANCELLED,
            },
          },
          select: {
            day: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  private buildTeacherUpdateData(payload: UpdateTeacherDto): TeacherUpdateData {
    const data: TeacherUpdateData = {};

    if (payload.firstName !== undefined) {
      data.firstName = payload.firstName;
    }
    if (payload.lastName !== undefined) {
      data.lastName = payload.lastName;
    }
    if (payload.email !== undefined) {
      data.email = payload.email;
    }
    if (payload.phone !== undefined) {
      data.phone = payload.phone;
    }
    if (payload.cin !== undefined) {
      data.cin = payload.cin;
    }
    if (payload.hourlyRate !== undefined) {
      data.hourlyRate = payload.hourlyRate;
    }
    if (payload.maxHoursPerWeek !== undefined) {
      data.maxHoursPerWeek = payload.maxHoursPerWeek;
    }

    return data;
  }

  private toTeacherSubjects(
    teacherSubjects: Array<{
      subject: {
        id: string;
        name: string;
      };
    }>,
  ): TeacherSubjectSummaryDto[] {
    const deduplicatedSubjects = new Map<string, TeacherSubjectSummaryDto>();

    for (const teacherSubject of teacherSubjects) {
      deduplicatedSubjects.set(teacherSubject.subject.id, {
        id: teacherSubject.subject.id,
        name: teacherSubject.subject.name,
      });
    }

    return [...deduplicatedSubjects.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }

  private calculateHoursThisWeek(
    sessions: Array<{
      startTime: Date;
      endTime: Date;
    }>,
  ): number {
    // CourseSession stores recurring weekly slots (day + time), so summing
    // durations of active sessions gives the teacher weekly workload.
    const total = sessions.reduce(
      (sum, session) =>
        sum +
        this.calculateSessionDurationHours(session.startTime, session.endTime),
      0,
    );

    return this.roundToTwoDecimals(total);
  }

  private calculateHoursThisMonth(
    sessions: Array<{
      day: DayOfWeek;
      startTime: Date;
      endTime: Date;
    }>,
    referenceDate: Date = new Date(),
  ): number {
    // Sessions are weekly recurring slots, so monthly hours are derived by:
    // session duration * number of weekday occurrences in the target month.
    const total = sessions.reduce((sum, session) => {
      const weeklyHours = this.calculateSessionDurationHours(
        session.startTime,
        session.endTime,
      );
      const occurrences = this.countDayOccurrencesInMonth(
        session.day,
        referenceDate,
      );

      return sum + weeklyHours * occurrences;
    }, 0);

    return this.roundToTwoDecimals(total);
  }

  private calculateSessionDurationHours(
    startTime: Date,
    endTime: Date,
  ): number {
    const durationInMilliseconds = endTime.getTime() - startTime.getTime();

    if (durationInMilliseconds <= 0) {
      return 0;
    }

    return durationInMilliseconds / (1000 * 60 * 60);
  }

  private countDayOccurrencesInMonth(
    day: DayOfWeek,
    referenceDate: Date,
  ): number {
    const year = referenceDate.getUTCFullYear();
    const month = referenceDate.getUTCMonth();
    const totalDaysInMonth = new Date(
      Date.UTC(year, month + 1, 0),
    ).getUTCDate();
    const targetDay = DAY_OF_WEEK_TO_JS_DAY[day];
    let count = 0;

    for (let date = 1; date <= totalDaysInMonth; date += 1) {
      const weekday = new Date(Date.UTC(year, month, date)).getUTCDay();
      if (weekday === targetDay) {
        count += 1;
      }
    }

    return count;
  }

  private async getTeacherMonthlyPaymentSummary(
    centerId: string,
    teacherId: string,
    monthRange: { start: Date; end: Date },
  ): Promise<TeacherMonthlyPaymentSummary> {
    const teacherPayments = await this.prismaService.payment.findMany({
      where: {
        centerId,
        teacherId,
        paymentDate: {
          gte: monthRange.start,
          lt: monthRange.end,
        },
      },
      select: {
        studentId: true,
        amount: true,
        rest: true,
      },
    });

    const collectedPayments = this.roundToTwoDecimals(
      teacherPayments.reduce((sum, payment) => {
        const paidAmount =
          this.toNumber(payment.amount) - this.toNumber(payment.rest);

        return sum + paidAmount;
      }, 0),
    );

    return {
      collectedPayments,
      paidStudents: new Set(teacherPayments.map((payment) => payment.studentId))
        .size,
    };
  }

  private getMonthDateRange(value: string): { start: Date; end: Date } {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      throw new BadRequestException('month must be in YYYY-MM format');
    }

    const [yearText, monthText] = value.split('-');
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;

    return {
      start: new Date(Date.UTC(year, monthIndex, 1)),
      end: new Date(Date.UTC(year, monthIndex + 1, 1)),
    };
  }

  private toNullableNumber(value: DecimalLike | null): number | null {
    if (value === null) {
      return null;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      return Number(value);
    }

    return value.toNumber();
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toNumber(value: DecimalLike): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      return Number(value);
    }

    return value.toNumber();
  }

  private isUniqueConstraintError(error: unknown): error is {
    code: 'P2002';
    meta?: { target?: unknown };
  } {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const record = error as { code?: unknown };
    return record.code === 'P2002';
  }

  private getUniqueConstraintTarget(error: {
    meta?: { target?: unknown };
  }): string {
    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.map((value) => String(value).toLowerCase()).join(',');
    }

    return typeof target === 'string' ? target.toLowerCase() : '';
  }
}

type DecimalLike =
  | number
  | string
  | {
      toNumber(): number;
    };

type TeacherMonthlyPaymentSummary = {
  collectedPayments: number;
  paidStudents: number;
};

type TeacherUpdateData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  cin?: string;
  hourlyRate?: number | null;
  maxHoursPerWeek?: number | null;
};
