import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentController } from './controllers/payment.controller';
import { PaymentReceiptPdfService } from './services/payment-receipt-pdf.service';
import { PaymentService } from './services/payment.service';

@Module({
  imports: [AuthModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentReceiptPdfService],
  exports: [PaymentReceiptPdfService],
})
export class PaymentModule {}
