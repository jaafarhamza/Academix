import {
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
import { QueryStudentDto } from '../dto/query-student.dto';
import { StudentStatusResponseDto } from '../dto/student-status-response.dto';
import { StudentResponseDto } from '../dto/student-response.dto';

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
    const payments: StudentPaymentSummaryDto[] = student.studentPayments.map(
      (payment) => {
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
      },
    );

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
      paymentSummary: {
        totalPayments: payments.length,
        totalAmount,
        totalPaid,
        totalRest,
        outstandingBalance: totalRest,
        lastPaymentDate: payments[0]?.paymentDate ?? null,
      },
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
