import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/enums';
import { PaymentReceiptPdfService } from './payment-receipt-pdf.service';

describe('PaymentReceiptPdfService', () => {
  let service: PaymentReceiptPdfService;

  beforeEach(() => {
    service = new PaymentReceiptPdfService();
  });

  it('generates a PDF buffer for a payment receipt', async () => {
    const pdfBuffer = await service.generateReceipt({
      receiptNumber: 'PAY-2026-0001',
      centerName: 'Atlas Learning Hub',
      studentName: 'Imane Alaoui',
      teacherName: 'Yara Tahiri',
      studentGroupName: 'Group 01',
      amount: 400,
      paidAmount: 300,
      rest: 100,
      paymentDate: '2026-04-06T12:00:00.000Z',
      method: PaymentMethod.CASH,
      status: PaymentStatus.PARTIALLY_PAID,
      notes: 'Paid at front desk',
    });

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.byteLength).toBeGreaterThan(0);
    expect(pdfBuffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });
});
