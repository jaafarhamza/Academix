import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  PaymentMethod,
  PaymentStatus,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaymentReceiptPdfService } from './payment-receipt-pdf.service';
import { PaymentReceiptStorageService } from './payment-receipt-storage.service';
import type { PaymentReceiptTemplateInput } from './payment-receipt.types';

type DecimalLike = number | string | { toNumber(): number };

type ReceiptGenerationPaymentRecord = {
  id: string;
  centerId: string;
  amount: DecimalLike;
  rest: DecimalLike;
  paymentDate: Date;
  method: PaymentMethod;
  status: PaymentStatus;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: Date;
  center: {
    centerName: string;
    logoUrl: string | null;
    stampUrl: string | null;
  };
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
export class PaymentReceiptGenerationService {
  private readonly logger = new Logger(PaymentReceiptGenerationService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly paymentReceiptPdfService: PaymentReceiptPdfService,
    private readonly paymentReceiptStorageService: PaymentReceiptStorageService,
  ) {}

  async generateAndAttachReceipt(
    centerId: string,
    paymentId: string,
  ): Promise<string> {
    const payment = await this.prismaService.payment.findFirst({
      where: {
        id: paymentId,
        centerId,
      },
      select: this.getReceiptPaymentSelect(),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.receiptUrl) {
      this.logger.debug(
        `Skipping receipt generation for payment ${paymentId} because receipt_url already exists`,
      );
      return payment.receiptUrl;
    }

    const receiptInput = this.toReceiptTemplateInput(payment);
    const pdf =
      await this.paymentReceiptPdfService.generateReceipt(receiptInput);
    const receiptUrl = await this.paymentReceiptStorageService.storeReceipt(
      payment.centerId,
      payment.id,
      pdf,
    );

    await this.prismaService.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        receiptUrl,
      },
    });

    this.logger.debug(
      `Stored receipt PDF and updated receipt_url for payment ${payment.id}`,
    );

    return receiptUrl;
  }

  private getReceiptPaymentSelect() {
    return {
      id: true,
      centerId: true,
      amount: true,
      rest: true,
      paymentDate: true,
      method: true,
      status: true,
      receiptUrl: true,
      notes: true,
      createdAt: true,
      center: {
        select: {
          centerName: true,
          logoUrl: true,
          stampUrl: true,
        },
      },
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

  private toReceiptTemplateInput(
    payment: ReceiptGenerationPaymentRecord,
  ): PaymentReceiptTemplateInput {
    const amount = this.toNumber(payment.amount);
    const rest = this.toNumber(payment.rest);
    const paidAmount = this.fromCents(
      this.toCents(amount) - this.toCents(rest),
    );

    return {
      receiptNumber: this.buildReceiptNumber(payment),
      centerName: payment.center.centerName,
      centerLogoUrl: payment.center.logoUrl,
      centerStampUrl: payment.center.stampUrl,
      centerStampLabel: `${payment.center.centerName} Stamp`,
      studentName: this.toDisplayName(payment.student),
      teacherName: this.toDisplayName(payment.teacher),
      studentGroupName: payment.studentGroup?.name ?? null,
      amount,
      paidAmount,
      rest,
      paymentDate: payment.paymentDate.toISOString(),
      method: payment.method,
      status: payment.status,
      notes: payment.notes,
    };
  }

  private buildReceiptNumber(payment: ReceiptGenerationPaymentRecord): string {
    const datePart = payment.paymentDate
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');
    const suffix = payment.id.replace(/-/g, '').slice(-8).toUpperCase();
    return `PAY-${datePart}-${suffix}`;
  }

  private toDisplayName(person: {
    firstName: string;
    lastName: string;
  }): string {
    return `${person.firstName} ${person.lastName}`;
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

  private toCents(value: number): number {
    return Math.round(value * 100);
  }

  private fromCents(value: number): number {
    return Number((value / 100).toFixed(2));
  }
}
