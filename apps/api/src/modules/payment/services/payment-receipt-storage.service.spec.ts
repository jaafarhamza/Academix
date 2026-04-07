import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { PaymentReceiptStorageService } from './payment-receipt-storage.service';

jest.mock('minio', () => ({
  Client: jest.fn(),
}));

describe('PaymentReceiptStorageService', () => {
  const bucketExists = jest.fn<Promise<boolean>, [string]>();
  const makeBucket = jest.fn<Promise<void>, [string]>();
  const setBucketPolicy = jest.fn<Promise<void>, [string, string]>();
  const putObject = jest.fn<
    Promise<void>,
    [string, string, Buffer, number, Record<string, string>]
  >();
  const get = jest.fn<unknown, [string]>();

  let service: PaymentReceiptStorageService;

  beforeEach(() => {
    jest.resetAllMocks();
    bucketExists.mockResolvedValue(true);
    makeBucket.mockResolvedValue(undefined);
    setBucketPolicy.mockResolvedValue(undefined);
    putObject.mockResolvedValue(undefined);
    get.mockImplementation((key: string) => {
      const values: Record<string, unknown> = {
        'storage.minio.endpoint': 'localhost',
        'storage.minio.port': 9000,
        'storage.minio.useSsl': false,
        'storage.minio.accessKey': 'minioadmin',
        'storage.minio.secretKey': 'minioadmin',
        'storage.minio.bucket': 'academix-center-assets',
        'storage.minio.publicBaseUrl': 'http://localhost:9000',
        'storage.minio.autoCreateBucket': true,
      };

      return values[key];
    });

    (Client as jest.Mock).mockImplementation(() => ({
      bucketExists,
      makeBucket,
      setBucketPolicy,
      putObject,
    }));

    service = new PaymentReceiptStorageService({
      get,
    } as unknown as ConfigService);
  });

  it('uploads the generated PDF and returns its public object URL', async () => {
    const pdf = Buffer.from('%PDF mocked receipt');

    const url = await service.storeReceipt('center-1', 'payment-1', pdf);

    expect(bucketExists).toHaveBeenCalledWith('academix-center-assets');
    expect(setBucketPolicy).toHaveBeenCalledTimes(1);
    expect(putObject).toHaveBeenCalledWith(
      'academix-center-assets',
      expect.stringContaining('centers/center-1/receipts/payments/'),
      pdf,
      pdf.byteLength,
      expect.objectContaining({
        'Content-Type': 'application/pdf',
      }),
    );
    expect(url).toContain('http://localhost:9000/academix-center-assets/');
    expect(url).toContain('payment-1');
  });

  it('creates the bucket when it is missing and auto creation is enabled', async () => {
    bucketExists.mockResolvedValue(false);

    await service.storeReceipt('center-1', 'payment-1', Buffer.from('pdf'));

    expect(makeBucket).toHaveBeenCalledWith('academix-center-assets');
    expect(setBucketPolicy).toHaveBeenCalledTimes(1);
  });

  it('throws a ServiceUnavailableException when upload fails', async () => {
    putObject.mockRejectedValueOnce(new Error('MinIO down'));

    await expect(
      service.storeReceipt('center-1', 'payment-1', Buffer.from('pdf')),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
