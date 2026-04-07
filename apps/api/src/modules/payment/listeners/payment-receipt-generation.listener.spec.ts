import { PaymentReceiptGenerationListener } from './payment-receipt-generation.listener';

describe('PaymentReceiptGenerationListener', () => {
  const generateAndAttachReceipt = jest.fn<Promise<string>, [string, string]>();

  let listener: PaymentReceiptGenerationListener;

  beforeEach(() => {
    jest.resetAllMocks();
    generateAndAttachReceipt.mockResolvedValue(
      'https://cdn.example.com/receipt-1.pdf',
    );
    listener = new PaymentReceiptGenerationListener({
      generateAndAttachReceipt,
    } as never);
  });

  it('delegates payment.created events to the receipt generation service', async () => {
    await listener.handlePaymentCreated({
      payment_id: 'payment-1',
      center_id: 'center-1',
      student_id: 'student-1',
      teacher_id: 'teacher-1',
      student_group_id: 'group-1',
      course_session_id: null,
      amount: 400,
      rest: 0,
      paid_amount: 400,
      payment_date: '2026-04-06T12:00:00.000Z',
      method: 'CASH',
      status: 'PAID',
      receipt_url: null,
      created_at: '2026-04-06T12:00:00.000Z',
    });

    expect(generateAndAttachReceipt).toHaveBeenCalledWith(
      'center-1',
      'payment-1',
    );
  });
});
