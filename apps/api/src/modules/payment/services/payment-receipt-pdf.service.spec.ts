import { ConfigService } from '@nestjs/config';
import { launch } from 'puppeteer-core';
import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/enums';
import { PaymentReceiptHtmlService } from './payment-receipt-html.service';
import { PaymentReceiptPdfService } from './payment-receipt-pdf.service';

jest.mock('puppeteer-core', () => ({
  launch: jest.fn(),
}));

describe('PaymentReceiptPdfService', () => {
  const setContent = jest.fn<Promise<void>, [string, unknown]>();
  const pdf = jest.fn<Promise<Uint8Array>, [unknown]>();
  const close = jest.fn<Promise<void>, []>();
  const newPage = jest.fn<Promise<unknown>, []>();
  const renderReceipt = jest.fn<string, [unknown]>();
  const get = jest.fn<unknown, [string]>();

  let service: PaymentReceiptPdfService;

  beforeEach(() => {
    jest.resetAllMocks();
    setContent.mockResolvedValue(undefined);
    pdf.mockResolvedValue(
      Uint8Array.from(Buffer.from('%PDF mocked receipt content', 'utf8')),
    );
    close.mockResolvedValue(undefined);
    newPage.mockResolvedValue({
      setContent,
      pdf,
    });
    renderReceipt.mockReturnValue('<html><body>Receipt</body></html>');
    get.mockImplementation((key: string) => {
      if (key === 'receiptPdf.executablePath') {
        return process.execPath;
      }

      if (key === 'receiptPdf.headless') {
        return true;
      }

      return undefined;
    });
    (launch as jest.Mock).mockResolvedValue({
      newPage,
      close,
    });

    service = new PaymentReceiptPdfService(
      {
        renderReceipt,
      } as unknown as PaymentReceiptHtmlService,
      {
        get,
      } as unknown as ConfigService,
    );
  });

  it('generates a PDF buffer for a payment receipt from the HTML template', async () => {
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
    expect(renderReceipt).toHaveBeenCalledTimes(1);
    expect(setContent).toHaveBeenCalledWith(
      '<html><body>Receipt</body></html>',
      expect.objectContaining({
        waitUntil: 'networkidle0',
      }),
    );
    expect(pdf).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'A4',
        printBackground: true,
      }),
    );
    expect(close).toHaveBeenCalledTimes(1);
  });
});
