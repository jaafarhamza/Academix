import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PaymentController } from './controllers/payment.controller';
import { PaymentReceiptGenerationListener } from './listeners/payment-receipt-generation.listener';
import { PaymentReceiptAccessService } from './services/payment-receipt-access.service';
import { PaymentReceiptHtmlService } from './services/payment-receipt-html.service';
import { PaymentReceiptGenerationService } from './services/payment-receipt-generation.service';
import { PaymentReceiptPdfService } from './services/payment-receipt-pdf.service';
import { PaymentReceiptStorageService } from './services/payment-receipt-storage.service';
import { PaymentService } from './services/payment.service';

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentReceiptAccessService,
    PaymentReceiptHtmlService,
    PaymentReceiptPdfService,
    PaymentReceiptStorageService,
    PaymentReceiptGenerationService,
    PaymentReceiptGenerationListener,
  ],
  exports: [
    PaymentReceiptHtmlService,
    PaymentReceiptPdfService,
    PaymentReceiptStorageService,
    PaymentReceiptGenerationService,
    PaymentReceiptAccessService,
  ],
})
export class PaymentModule {}
