import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PaymentController } from './controllers/payment.controller';
import { PaymentReceiptHtmlService } from './services/payment-receipt-html.service';
import { PaymentReceiptPdfService } from './services/payment-receipt-pdf.service';
import { PaymentService } from './services/payment.service';

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentReceiptHtmlService,
    PaymentReceiptPdfService,
  ],
  exports: [PaymentReceiptHtmlService, PaymentReceiptPdfService],
})
export class PaymentModule {}
