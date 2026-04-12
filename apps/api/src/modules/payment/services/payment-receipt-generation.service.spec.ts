import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/enums';
import { PaymentReceiptPdfService } from './payment-receipt-pdf.service';
import { PaymentReceiptGenerationService } from './payment-receipt-generation.service';
import { PaymentReceiptStorageService } from './payment-receipt-storage.service';

describe('PaymentReceiptGenerationService', () => {
  const paymentFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const paymentUpdate = jest.fn<Promise<unknown>, [unknown]>();
  const generateReceipt = jest.fn<Promise<Buffer>, [unknown]>();
  const storeReceipt = jest.fn<Promise<string>, [string, string, Buffer]>();

  const prismaService = {
    payment: {
      findFirst: paymentFindFirst,
      update: paymentUpdate,
    },
  };

  let service: PaymentReceiptGenerationService;

  beforeEach(() => {
    jest.resetAllMocks();
    generateReceipt.mockResolvedValue(Buffer.from('%PDF receipt'));
    storeReceipt.mockResolvedValue('https://cdn.example.com/receipt-1.pdf');

    service = new PaymentReceiptGenerationService(
      prismaService as unknown as PrismaService,
      {
        generateReceipt,
      } as unknown as PaymentReceiptPdfService,
      {
        storeReceipt,
      } as unknown as PaymentReceiptStorageService,
    );
  });

  it('generates the receipt PDF, stores it, and updates payment.receiptUrl', async () => {
    paymentFindFirst.mockResolvedValueOnce({
      id: 'payment-12345678',
      centerId: 'center-1',
      amount: 400,
      rest: 100,
      paymentDate: new Date('2026-04-06T12:00:00.000Z'),
      method: PaymentMethod.CASH,
      status: PaymentStatus.PARTIALLY_PAID,
      receiptUrl: null,
      notes: 'April payment',
      createdAt: new Date('2026-04-06T12:00:00.000Z'),
      center: {
        centerName: 'Atlas Learning Hub',
        logoUrl: 'https://cdn.example.com/logo.png',
        stampUrl: 'https://cdn.example.com/stamp.png',
      },
      student: {
        firstName: 'Imane',
        lastName: 'Alaoui',
      },
      teacher: {
        firstName: 'Yara',
        lastName: 'Tahiri',
      },
      studentGroup: {
        name: 'Group 01',
      },
    });

    const receiptUrl = await service.generateAndAttachReceipt(
      'center-1',
      'payment-12345678',
    );

    expect(receiptUrl).toBe('https://cdn.example.com/receipt-1.pdf');
    expect(generateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        receiptNumber: 'PAY-20260406-12345678',
        centerName: 'Atlas Learning Hub',
        centerStampUrl: 'https://cdn.example.com/stamp.png',
        studentName: 'Imane Alaoui',
        teacherName: 'Yara Tahiri',
        studentGroupName: 'Group 01',
        amount: 400,
        paidAmount: 300,
        rest: 100,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PARTIALLY_PAID,
        notes: 'April payment',
      }),
    );
    expect(storeReceipt).toHaveBeenCalledWith(
      'center-1',
      'payment-12345678',
      expect.any(Buffer) as Buffer,
    );
    expect(paymentUpdate).toHaveBeenCalledWith({
      where: {
        id: 'payment-12345678',
      },
      data: {
        receiptUrl: 'https://cdn.example.com/receipt-1.pdf',
      },
    });
  });

  it('returns the existing receipt URL without regenerating when one is already present', async () => {
    paymentFindFirst.mockResolvedValueOnce({
      id: 'payment-1',
      centerId: 'center-1',
      amount: 400,
      rest: 0,
      paymentDate: new Date('2026-04-06T12:00:00.000Z'),
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      receiptUrl: 'https://cdn.example.com/existing-receipt.pdf',
      notes: null,
      createdAt: new Date('2026-04-06T12:00:00.000Z'),
      center: {
        centerName: 'Atlas Learning Hub',
        logoUrl: null,
        stampUrl: null,
      },
      student: {
        firstName: 'Imane',
        lastName: 'Alaoui',
      },
      teacher: {
        firstName: 'Yara',
        lastName: 'Tahiri',
      },
      studentGroup: null,
    });

    await expect(
      service.generateAndAttachReceipt('center-1', 'payment-1'),
    ).resolves.toBe('https://cdn.example.com/existing-receipt.pdf');

    expect(generateReceipt).not.toHaveBeenCalled();
    expect(storeReceipt).not.toHaveBeenCalled();
    expect(paymentUpdate).not.toHaveBeenCalled();
  });

  it('maps private payments cleanly when no student group is attached', async () => {
    paymentFindFirst.mockResolvedValueOnce({
      id: 'payment-private-1',
      centerId: 'center-1',
      amount: 250,
      rest: 0,
      paymentDate: new Date('2026-04-07T10:30:00.000Z'),
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      receiptUrl: null,
      notes: null,
      createdAt: new Date('2026-04-07T10:30:00.000Z'),
      center: {
        centerName: 'Nour Academy',
        logoUrl: null,
        stampUrl: null,
      },
      student: {
        firstName: 'Sara',
        lastName: 'Benali',
      },
      teacher: {
        firstName: 'Hiba',
        lastName: 'Skalli',
      },
      studentGroup: null,
    });

    await service.generateAndAttachReceipt('center-1', 'payment-private-1');

    expect(generateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        receiptNumber: 'PAY-20260407-PRIVATE1',
        centerName: 'Nour Academy',
        centerStampLabel: 'Nour Academy Stamp',
        studentName: 'Sara Benali',
        teacherName: 'Hiba Skalli',
        studentGroupName: null,
        amount: 250,
        paidAmount: 250,
        rest: 0,
        notes: null,
      }),
    );
  });

  it('does not store or update the payment when PDF generation fails', async () => {
    paymentFindFirst.mockResolvedValueOnce({
      id: 'payment-1',
      centerId: 'center-1',
      amount: 400,
      rest: 100,
      paymentDate: new Date('2026-04-06T12:00:00.000Z'),
      method: PaymentMethod.CASH,
      status: PaymentStatus.PARTIALLY_PAID,
      receiptUrl: null,
      notes: 'April payment',
      createdAt: new Date('2026-04-06T12:00:00.000Z'),
      center: {
        centerName: 'Atlas Learning Hub',
        logoUrl: 'https://cdn.example.com/logo.png',
        stampUrl: null,
      },
      student: {
        firstName: 'Imane',
        lastName: 'Alaoui',
      },
      teacher: {
        firstName: 'Yara',
        lastName: 'Tahiri',
      },
      studentGroup: {
        name: 'Group 01',
      },
    });
    generateReceipt.mockRejectedValueOnce(new Error('Chromium render failed'));

    await expect(
      service.generateAndAttachReceipt('center-1', 'payment-1'),
    ).rejects.toThrow('Chromium render failed');

    expect(storeReceipt).not.toHaveBeenCalled();
    expect(paymentUpdate).not.toHaveBeenCalled();
  });

  it('does not update receiptUrl when storage fails after PDF generation', async () => {
    paymentFindFirst.mockResolvedValueOnce({
      id: 'payment-1',
      centerId: 'center-1',
      amount: 400,
      rest: 100,
      paymentDate: new Date('2026-04-06T12:00:00.000Z'),
      method: PaymentMethod.CASH,
      status: PaymentStatus.PARTIALLY_PAID,
      receiptUrl: null,
      notes: 'April payment',
      createdAt: new Date('2026-04-06T12:00:00.000Z'),
      center: {
        centerName: 'Atlas Learning Hub',
        logoUrl: 'https://cdn.example.com/logo.png',
        stampUrl: null,
      },
      student: {
        firstName: 'Imane',
        lastName: 'Alaoui',
      },
      teacher: {
        firstName: 'Yara',
        lastName: 'Tahiri',
      },
      studentGroup: {
        name: 'Group 01',
      },
    });
    storeReceipt.mockRejectedValueOnce(new Error('MinIO unavailable'));

    await expect(
      service.generateAndAttachReceipt('center-1', 'payment-1'),
    ).rejects.toThrow('MinIO unavailable');

    expect(generateReceipt).toHaveBeenCalledTimes(1);
    expect(paymentUpdate).not.toHaveBeenCalled();
  });

  it('throws when the payment cannot be found for the given center', async () => {
    paymentFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.generateAndAttachReceipt('center-1', 'missing-payment'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
