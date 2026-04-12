import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/enums';
import { PaymentReceiptHtmlService } from './payment-receipt-html.service';

describe('PaymentReceiptHtmlService', () => {
  let service: PaymentReceiptHtmlService;

  beforeEach(() => {
    service = new PaymentReceiptHtmlService();
  });

  it('renders a receipt HTML template with logo, uploaded stamp, student, amount, date, and status', () => {
    const html = service.renderReceipt({
      receiptNumber: 'PAY-2026-0001',
      centerName: 'Atlas Learning Hub',
      centerLogoUrl: 'https://cdn.example.com/atlas-logo.png',
      centerStampUrl: 'https://cdn.example.com/atlas-stamp.png',
      centerStampLabel: 'Center Stamp',
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

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Atlas Learning Hub');
    expect(html).toContain('https://cdn.example.com/atlas-logo.png');
    expect(html).toContain('https://cdn.example.com/atlas-stamp.png');
    expect(html).toContain('Imane Alaoui');
    expect(html).toContain('Partially paid');
    expect(html).toContain('MAD');
    expect(html).toContain('300.00');
    expect(html).toContain('400.00');
    expect(html).toContain('100.00');
  });

  it('escapes user-provided text and falls back when logo is missing', () => {
    const html = service.renderReceipt({
      receiptNumber: 'PAY-2026-0002',
      centerName: 'Atlas <Center>',
      studentName: 'Imane <script>alert(1)</script>',
      teacherName: 'Teacher Name',
      amount: 200,
      paidAmount: 200,
      rest: 0,
      paymentDate: '2026-04-06T12:00:00.000Z',
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
    });

    expect(html).toContain('Atlas &lt;Center&gt;');
    expect(html).toContain('Imane &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('brand-logo--fallback');
    expect(html).toContain('Official Stamp');
  });
});
