import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PAYMENT_CREATED_EVENT } from '../constants/payment.events';
import type { PaymentCreatedEventPayload } from '../events/payment-created.event';
import { PaymentReceiptGenerationService } from '../services/payment-receipt-generation.service';

@Injectable()
export class PaymentReceiptGenerationListener {
  private readonly logger = new Logger(PaymentReceiptGenerationListener.name);

  constructor(
    private readonly paymentReceiptGenerationService: PaymentReceiptGenerationService,
  ) {}

  @OnEvent(PAYMENT_CREATED_EVENT, {
    async: true,
    suppressErrors: true,
  })
  async handlePaymentCreated(
    payload: PaymentCreatedEventPayload,
  ): Promise<void> {
    this.logger.debug(
      `payment.created received for payment ${payload.payment_id}`,
    );

    await this.paymentReceiptGenerationService.generateAndAttachReceipt(
      payload.center_id,
      payload.payment_id,
    );
  }
}
