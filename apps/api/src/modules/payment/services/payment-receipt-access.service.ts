import { Injectable, NotFoundException } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaymentReceiptGenerationService } from './payment-receipt-generation.service';
import { PaymentReceiptStorageService } from './payment-receipt-storage.service';

export type PaymentReceiptDownload = {
  fileName: string;
  stream: Readable;
};

@Injectable()
export class PaymentReceiptAccessService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly paymentReceiptGenerationService: PaymentReceiptGenerationService,
    private readonly paymentReceiptStorageService: PaymentReceiptStorageService,
  ) {}

  async downloadReceipt(
    centerId: string,
    paymentId: string,
  ): Promise<PaymentReceiptDownload> {
    const payment = await this.prismaService.payment.findFirst({
      where: {
        id: paymentId,
        centerId,
      },
      select: {
        id: true,
        paymentDate: true,
        receiptUrl: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const receiptUrl =
      payment.receiptUrl ??
      (await this.paymentReceiptGenerationService.generateAndAttachReceipt(
        centerId,
        payment.id,
      ));

    const stream =
      await this.paymentReceiptStorageService.getReceiptStream(receiptUrl);

    return {
      fileName: this.buildReceiptFileName(payment.id, payment.paymentDate),
      stream,
    };
  }

  private buildReceiptFileName(paymentId: string, paymentDate: Date): string {
    const datePart = paymentDate.toISOString().slice(0, 10);
    return `payment-receipt-${datePart}-${paymentId}.pdf`;
  }
}
