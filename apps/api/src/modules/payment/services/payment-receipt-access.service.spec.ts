import { NotFoundException } from '@nestjs/common';
import { Readable } from 'node:stream';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { PaymentReceiptAccessService } from './payment-receipt-access.service';
import { PaymentReceiptGenerationService } from './payment-receipt-generation.service';
import { PaymentReceiptStorageService } from './payment-receipt-storage.service';

describe('PaymentReceiptAccessService', () => {
  const paymentFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const generateAndAttachReceipt = jest.fn<Promise<string>, [string, string]>();
  const getReceiptStream = jest.fn<Promise<Readable>, [string]>();

  const prismaService = {
    payment: {
      findFirst: paymentFindFirst,
    },
  };

  let service: PaymentReceiptAccessService;

  beforeEach(() => {
    jest.resetAllMocks();
    getReceiptStream.mockResolvedValue(
      Readable.from(Buffer.from('%PDF receipt')),
    );

    service = new PaymentReceiptAccessService(
      prismaService as unknown as PrismaService,
      {
        generateAndAttachReceipt,
      } as unknown as PaymentReceiptGenerationService,
      {
        getReceiptStream,
      } as unknown as PaymentReceiptStorageService,
    );
  });

  it('downloads an existing receipt without regenerating it', async () => {
    paymentFindFirst.mockResolvedValueOnce({
      id: 'payment-1',
      paymentDate: new Date('2026-04-06T12:00:00.000Z'),
      receiptUrl: 'https://cdn.example.com/receipt-1.pdf',
    });

    const result = await service.downloadReceipt('center-1', 'payment-1');

    expect(generateAndAttachReceipt).not.toHaveBeenCalled();
    expect(getReceiptStream).toHaveBeenCalledWith(
      'https://cdn.example.com/receipt-1.pdf',
    );
    expect(result.fileName).toBe('payment-receipt-2026-04-06-payment-1.pdf');
  });

  it('generates and downloads the receipt when receiptUrl is missing', async () => {
    paymentFindFirst.mockResolvedValueOnce({
      id: 'payment-1',
      paymentDate: new Date('2026-04-06T12:00:00.000Z'),
      receiptUrl: null,
    });
    generateAndAttachReceipt.mockResolvedValueOnce(
      'https://cdn.example.com/generated-receipt-1.pdf',
    );

    await service.downloadReceipt('center-1', 'payment-1');

    expect(generateAndAttachReceipt).toHaveBeenCalledWith(
      'center-1',
      'payment-1',
    );
    expect(getReceiptStream).toHaveBeenCalledWith(
      'https://cdn.example.com/generated-receipt-1.pdf',
    );
  });

  it('throws when the payment cannot be found', async () => {
    paymentFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.downloadReceipt('center-1', 'missing-payment'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
