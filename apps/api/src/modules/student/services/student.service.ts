import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SchoolCycle,
  SchoolYear,
  UserRole,
} from '../../../generated/prisma/enums';
import type { Prisma } from '../../../generated/prisma/client';
import { hashPassword } from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import {
  StudentDetailResponseDto,
  StudentPaymentSummaryDto,
} from '../dto/student-detail-response.dto';
import { StudentPaymentHistoryResponseDto } from '../dto/student-payment-history-response.dto';
import { QueryStudentDto } from '../dto/query-student.dto';
import { StudentStatusResponseDto } from '../dto/student-status-response.dto';
import { StudentResponseDto } from '../dto/student-response.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';

type DecimalLike = { toNumber(): number } | number;
const studentDetailSelect = {
  id: true,
  centerId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  parentPhone: true,
  schoolName: true,
  schoolCycle: true,
  schoolYear: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  enrollments: {
    orderBy: [{ enrollmentDate: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      enrollmentDate: true,
      isActive: true,
      studentGroup: {
        select: {
          id: true,
          name: true,
          schoolCycle: true,
          schoolYear: true,
        },
      },
    },
  },
  studentPayments: {
    orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      amount: true,
      rest: true,
      status: true,
      method: true,
      paymentDate: true,
      receiptUrl: true,
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      studentGroup: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const satisfies Prisma.UserSelect;
type StudentDetailRecord = Prisma.UserGetPayload<{
  select: typeof studentDetailSelect;
}>;
const ALLOWED_SCHOOL_YEARS_BY_CYCLE: Record<SchoolCycle, SchoolYear[]> = {
  [SchoolCycle.PRIMARY]: [
    SchoolYear.FIRST_YEAR,
    SchoolYear.SECOND_YEAR,
    SchoolYear.THIRD_YEAR,
    SchoolYear.FOURTH_YEAR,
    SchoolYear.FIFTH_YEAR,
    SchoolYear.SIXTH_YEAR,
  ],
  [SchoolCycle.COLLEGE]: [
    SchoolYear.FIRST_YEAR,
    SchoolYear.SECOND_YEAR,
    SchoolYear.THIRD_YEAR,
  ],
  [SchoolCycle.LYCEE]: [
    SchoolYear.FIRST_YEAR,
    SchoolYear.SECOND_YEAR,
    SchoolYear.THIRD_YEAR,
  ],
};

@Injectable()
export class StudentService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    centerId: string,
    payload: CreateStudentDto,
  ): Promise<StudentResponseDto> {
    const passwordHash = await hashPassword(payload.password);

    try {
      const student = await this.prismaService.user.create({
        data: {
          centerId,
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          passwordHash,
          phone: payload.phone,
          role: UserRole.STUDENT,
          parentPhone: payload.parentPhone,
          schoolName: payload.schoolName,
          schoolCycle: payload.schoolCycle,
          schoolYear: payload.schoolYear,
        },
        select: {
          id: true,
          centerId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          parentPhone: true,
          schoolName: true,
          schoolCycle: true,
          schoolYear: true,
          isActive: true,
          createdAt: true,
        },
      });

      return this.toStudentResponse(student);
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const target = this.getUniqueConstraintTarget(error);
      if (target.includes('email')) {
        throw new ConflictException('Student email already in use');
      }

      throw new ConflictException(
        'Student already exists with the provided unique fields',
      );
    }
  }

  async findAll(
    centerId: string,
    query: QueryStudentDto,
  ): Promise<StudentResponseDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const students = await this.prismaService.user.findMany({
      where: {
        centerId,
        role: UserRole.STUDENT,
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.schoolCycle ? { schoolCycle: query.schoolCycle } : {}),
        ...(query.schoolYear ? { schoolYear: query.schoolYear } : {}),
        ...(query.groupId
          ? {
              enrollments: {
                some: {
                  studentGroupId: query.groupId,
                  isActive: true,
                },
              },
            }
          : {}),
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
                  phone: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  parentPhone: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  schoolName: {
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
        parentPhone: true,
        schoolName: true,
        schoolCycle: true,
        schoolYear: true,
        isActive: true,
        createdAt: true,
      },
    });

    return students.map((student) => this.toStudentResponse(student));
  }

  async findOne(
    centerId: string,
    id: string,
  ): Promise<StudentDetailResponseDto> {
    const student = await this.findStudentDetailRecordOrThrow(centerId, id);
    return this.toStudentDetailResponse(student);
  }

  async findPaymentHistory(
    centerId: string,
    id: string,
  ): Promise<StudentPaymentHistoryResponseDto> {
    const student = await this.findStudentDetailRecordOrThrow(centerId, id);
    return this.toStudentPaymentHistoryResponse(student);
  }

  async update(
    centerId: string,
    id: string,
    payload: UpdateStudentDto,
  ): Promise<StudentDetailResponseDto> {
    const existingStudent = await this.findStudentDetailRecordOrThrow(
      centerId,
      id,
    );
    this.ensureSchoolCycleAndSchoolYearCompatibility(existingStudent, payload);

    const data = this.buildStudentUpdateData(payload);
    if (Object.keys(data).length === 0) {
      return this.toStudentDetailResponse(existingStudent);
    }

    try {
      const student = await this.prismaService.user.update({
        where: {
          id,
        },
        data,
        select: studentDetailSelect,
      });

      return this.toStudentDetailResponse(student);
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const target = this.getUniqueConstraintTarget(error);
      if (target.includes('email')) {
        throw new ConflictException('Student email already in use');
      }

      throw new ConflictException(
        'Student already exists with the provided unique fields',
      );
    }
  }

  async deactivate(centerId: string, id: string): Promise<void> {
    const student = await this.findStudentStateRecordOrThrow(centerId, id);

    if (!student.isActive) {
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
    const student = await this.findStudentStateRecordOrThrow(centerId, id);

    if (student.isActive) {
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

  getStatus(): StudentStatusResponseDto {
    return {
      module: 'student',
      status: 'ready',
    };
  }

  private async findStudentDetailRecordOrThrow(centerId: string, id: string) {
    const student = await this.prismaService.user.findFirst({
      where: {
        id,
        centerId,
        role: UserRole.STUDENT,
      },
      select: studentDetailSelect,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  private async findStudentStateRecordOrThrow(centerId: string, id: string) {
    const student = await this.prismaService.user.findFirst({
      where: {
        id,
        centerId,
        role: UserRole.STUDENT,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  private buildStudentUpdateData(payload: UpdateStudentDto): StudentUpdateData {
    const data: StudentUpdateData = {};

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
    if (payload.parentPhone !== undefined) {
      data.parentPhone = payload.parentPhone;
    }
    if (payload.schoolName !== undefined) {
      data.schoolName = payload.schoolName;
    }
    if (payload.schoolCycle !== undefined) {
      data.schoolCycle = payload.schoolCycle;
    }
    if (payload.schoolYear !== undefined) {
      data.schoolYear = payload.schoolYear;
    }

    return data;
  }

  private ensureSchoolCycleAndSchoolYearCompatibility(
    existingStudent: StudentDetailRecord,
    payload: UpdateStudentDto,
  ): void {
    if (payload.schoolCycle === undefined && payload.schoolYear === undefined) {
      return;
    }

    const effectiveSchoolCycle =
      payload.schoolCycle ?? existingStudent.schoolCycle;
    const effectiveSchoolYear =
      payload.schoolYear ?? existingStudent.schoolYear;

    if (!effectiveSchoolCycle || !effectiveSchoolYear) {
      return;
    }

    if (
      ALLOWED_SCHOOL_YEARS_BY_CYCLE[effectiveSchoolCycle].includes(
        effectiveSchoolYear,
      )
    ) {
      return;
    }

    if (effectiveSchoolCycle === SchoolCycle.PRIMARY) {
      throw new BadRequestException(
        'schoolYear must be between FIRST_YEAR and SIXTH_YEAR for PRIMARY',
      );
    }

    throw new BadRequestException(
      'schoolYear must be between FIRST_YEAR and THIRD_YEAR for COLLEGE/LYCEE',
    );
  }

  private toStudentResponse(student: {
    id: string;
    centerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    parentPhone: string | null;
    schoolName: string | null;
    schoolCycle: SchoolCycle | null;
    schoolYear: SchoolYear | null;
    isActive: boolean;
    createdAt: Date;
  }): StudentResponseDto {
    return {
      id: student.id,
      center_id: student.centerId,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      role: student.role,
      parentPhone: student.parentPhone,
      schoolName: student.schoolName,
      schoolCycle: student.schoolCycle,
      schoolYear: student.schoolYear,
      isActive: student.isActive,
      createdAt: student.createdAt,
    };
  }

  private toStudentDetailResponse(
    student: StudentDetailRecord,
  ): StudentDetailResponseDto {
    const payments = this.toStudentPaymentSummaries(student);
    const paymentSummary = this.toStudentPaymentOverview(payments);

    return {
      id: student.id,
      center_id: student.centerId,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      role: student.role,
      parentPhone: student.parentPhone,
      schoolName: student.schoolName,
      schoolCycle: student.schoolCycle,
      schoolYear: student.schoolYear,
      isActive: student.isActive,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      enrollments: student.enrollments.map((enrollment) => ({
        id: enrollment.id,
        enrollmentDate: enrollment.enrollmentDate,
        isActive: enrollment.isActive,
        groupId: enrollment.studentGroup.id,
        groupName: enrollment.studentGroup.name,
        schoolCycle: enrollment.studentGroup.schoolCycle,
        schoolYear: enrollment.studentGroup.schoolYear,
      })),
      payments,
      paymentSummary,
    };
  }

  private toStudentPaymentHistoryResponse(
    student: StudentDetailRecord,
  ): StudentPaymentHistoryResponseDto {
    const payments = this.toStudentPaymentSummaries(student);
    const paymentSummary = this.toStudentPaymentOverview(payments);

    return {
      id: student.id,
      center_id: student.centerId,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      schoolName: student.schoolName,
      createdAt: student.createdAt,
      payments,
      paymentSummary,
    };
  }

  private toStudentPaymentSummaries(
    student: StudentDetailRecord,
  ): StudentPaymentSummaryDto[] {
    return student.studentPayments.map((payment) => {
      const amount = this.toNumber(payment.amount);
      const rest = this.toNumber(payment.rest);

      return {
        id: payment.id,
        amount,
        rest,
        paidAmount: amount - rest,
        status: payment.status,
        method: payment.method,
        paymentDate: payment.paymentDate,
        receiptUrl: payment.receiptUrl,
        teacherId: payment.teacher.id,
        teacherName:
          `${payment.teacher.firstName} ${payment.teacher.lastName}`.trim(),
        studentGroupId: payment.studentGroup?.id ?? null,
        studentGroupName: payment.studentGroup?.name ?? null,
      };
    });
  }

  private toStudentPaymentOverview(payments: StudentPaymentSummaryDto[]) {
    const totalAmount = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const totalPaid = payments.reduce(
      (sum, payment) => sum + payment.paidAmount,
      0,
    );
    const totalRest = payments.reduce((sum, payment) => sum + payment.rest, 0);

    return {
      totalPayments: payments.length,
      totalAmount,
      totalPaid,
      totalRest,
      outstandingBalance: totalRest,
      lastPaymentDate: payments[0]?.paymentDate ?? null,
    };
  }

  private toNumber(value: DecimalLike): number {
    return typeof value === 'number' ? value : value.toNumber();
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

type StudentUpdateData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  parentPhone?: string;
  schoolName?: string;
  schoolCycle?: SchoolCycle;
  schoolYear?: SchoolYear;
};
