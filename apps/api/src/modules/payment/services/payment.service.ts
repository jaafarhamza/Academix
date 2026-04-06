import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PAYMENT_CREATED_EVENT } from '../constants/payment.events';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { PaymentStatusResponseDto } from '../dto/payment-status-response.dto';
import { QueryPaymentDto } from '../dto/query-payment.dto';
import type { PaymentCreatedEventPayload } from '../events/payment-created.event';

type DecimalLike = number | string | { toNumber(): number };

type PaymentRecord = {
  id: string;
  centerId: string;
  studentId: string;
  teacherId: string;
  studentGroupId: string | null;
  courseSessionId: string | null;
  amount: DecimalLike;
  rest: DecimalLike;
  paymentDate: Date;
  method: PaymentMethod;
  status: PaymentStatus;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: Date;
  student: {
    firstName: string;
    lastName: string;
  };
  teacher: {
    firstName: string;
    lastName: string;
  };
  studentGroup: {
    name: string;
  } | null;
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    centerId: string,
    payload: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const amount = this.normalizeCurrency(payload.amount, 'amount');
    const paidAmount = amount;

    const [student, teacher, studentGroup] = await Promise.all([
      this.prismaService.user.findFirst({
        where: {
          id: payload.student_id,
          centerId,
          role: UserRole.STUDENT,
          isActive: true,
        },
        select: {
          id: true,
        },
      }),
      this.prismaService.user.findFirst({
        where: {
          id: payload.teacher_id,
          centerId,
          role: UserRole.TEACHER,
          isActive: true,
        },
        select: {
          id: true,
        },
      }),
      payload.student_group_id
        ? this.prismaService.studentGroup.findFirst({
            where: {
              id: payload.student_group_id,
              centerId,
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (payload.student_group_id && !studentGroup) {
      throw new NotFoundException('Student group not found');
    }

    if (studentGroup) {
      await this.ensureStudentEnrollment(centerId, student.id, studentGroup.id);
    }

    const rest = this.fromCents(
      this.toCents(amount) - this.toCents(paidAmount),
    );
    const status = this.resolvePaymentStatus(rest, paidAmount);
    const paymentDate = new Date();

    const payment = await this.prismaService.payment.create({
      data: {
        centerId,
        studentId: student.id,
        teacherId: teacher.id,
        studentGroupId: studentGroup?.id ?? null,
        courseSessionId: null,
        amount,
        rest,
        paymentDate,
        method: payload.method ?? PaymentMethod.CASH,
        status,
        notes: payload.notes ?? null,
      },
      select: this.getPaymentSelect(),
    });

    const response = this.toPaymentResponse(payment);
    this.emitPaymentCreatedEvent(response);

    return response;
  }

  async findAll(
    centerId: string,
    query: QueryPaymentDto,
  ): Promise<PaymentResponseDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const payments = await this.prismaService.payment.findMany({
      where: {
        centerId,
        ...(query.student_id ? { studentId: query.student_id } : {}),
        ...(query.teacher_id ? { teacherId: query.teacher_id } : {}),
        ...(query.student_group_id
          ? { studentGroupId: query.student_group_id }
          : {}),
        ...(query.course_session_id
          ? { courseSessionId: query.course_session_id }
          : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.payment_from || query.payment_to
          ? {
              paymentDate: {
                ...(query.payment_from
                  ? { gte: new Date(query.payment_from) }
                  : {}),
                ...(query.payment_to
                  ? { lte: new Date(query.payment_to) }
                  : {}),
              },
            }
          : {}),
      },
      orderBy: [{ paymentDate: 'desc' }, { id: 'asc' }],
      skip,
      take: limit,
      select: this.getPaymentSelect(),
    });

    return payments.map((payment) => this.toPaymentResponse(payment));
  }

  getStatus(): PaymentStatusResponseDto {
    return {
      module: 'payment',
      status: 'ready',
    };
  }

  private async ensureStudentEnrollment(
    centerId: string,
    studentId: string,
    studentGroupId: string,
  ): Promise<void> {
    const enrollment = await this.prismaService.enrollment.findFirst({
      where: {
        studentId,
        studentGroupId,
        isActive: true,
        student: {
          centerId,
          role: UserRole.STUDENT,
        },
        studentGroup: {
          centerId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!enrollment) {
      throw new BadRequestException(
        'Student is not actively enrolled in the specified group',
      );
    }
  }

  private resolvePaymentStatus(
    rest: number,
    paidAmount: number,
  ): PaymentStatus {
    if (rest === 0) {
      return PaymentStatus.PAID;
    }

    if (paidAmount === 0) {
      return PaymentStatus.UNPAID;
    }

    return PaymentStatus.PARTIALLY_PAID;
  }

  private getPaymentSelect() {
    return {
      id: true,
      centerId: true,
      studentId: true,
      teacherId: true,
      studentGroupId: true,
      courseSessionId: true,
      amount: true,
      rest: true,
      paymentDate: true,
      method: true,
      status: true,
      receiptUrl: true,
      notes: true,
      createdAt: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      teacher: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      studentGroup: {
        select: {
          name: true,
        },
      },
    };
  }

  private toPaymentResponse(payment: PaymentRecord): PaymentResponseDto {
    const amount = this.toNumber(payment.amount);
    const rest = this.toNumber(payment.rest);

    return {
      id: payment.id,
      center_id: payment.centerId,
      student_id: payment.studentId,
      studentName: this.toDisplayName(payment.student),
      teacher_id: payment.teacherId,
      teacherName: this.toDisplayName(payment.teacher),
      student_group_id: payment.studentGroupId,
      studentGroupName: payment.studentGroup?.name ?? null,
      course_session_id: payment.courseSessionId,
      amount,
      rest,
      paidAmount: this.fromCents(this.toCents(amount) - this.toCents(rest)),
      paymentDate: payment.paymentDate.toISOString(),
      method: payment.method,
      status: payment.status,
      receiptUrl: payment.receiptUrl,
      notes: payment.notes,
      createdAt: payment.createdAt.toISOString(),
    };
  }

  private emitPaymentCreatedEvent(payment: PaymentResponseDto): void {
    const payload: PaymentCreatedEventPayload = {
      payment_id: payment.id,
      center_id: payment.center_id,
      student_id: payment.student_id,
      teacher_id: payment.teacher_id,
      student_group_id: payment.student_group_id,
      course_session_id: payment.course_session_id,
      amount: payment.amount,
      rest: payment.rest,
      paid_amount: payment.paidAmount,
      payment_date: payment.paymentDate,
      method: payment.method,
      status: payment.status,
      receipt_url: payment.receiptUrl,
      created_at: payment.createdAt,
    };

    void this.eventEmitter
      .emitAsync(PAYMENT_CREATED_EVENT, payload)
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown emitter error';
        this.logger.warn(
          `Failed to emit ${PAYMENT_CREATED_EVENT} for payment ${payment.id}: ${message}`,
        );
      });
  }

  private toDisplayName(person: {
    firstName: string;
    lastName: string;
  }): string {
    return `${person.firstName} ${person.lastName}`;
  }

  private normalizeCurrency(value: number, fieldName: string): number {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }

    const cents = this.toCents(value);

    if (cents < 0) {
      throw new BadRequestException(
        `${fieldName} must be greater than or equal to 0`,
      );
    }

    return this.fromCents(cents);
  }

  private toCents(value: number): number {
    return Math.round(value * 100);
  }

  private fromCents(value: number): number {
    return Number((value / 100).toFixed(2));
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
}
