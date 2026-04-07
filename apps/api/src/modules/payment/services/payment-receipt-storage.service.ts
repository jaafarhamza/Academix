import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'minio';

const DEFAULT_BUCKET = 'academix-center-assets';

@Injectable()
export class PaymentReceiptStorageService {
  private readonly logger = new Logger(PaymentReceiptStorageService.name);
  private readonly minioClient: Client;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string | null;
  private readonly autoCreateBucket: boolean;
  private readonly endpoint: string;
  private readonly port: number;
  private readonly useSsl: boolean;

  constructor(private readonly configService: ConfigService) {
    this.endpoint =
      this.configService.get<string>('storage.minio.endpoint') ?? 'localhost';
    this.port = this.configService.get<number>('storage.minio.port') ?? 9000;
    this.useSsl =
      this.configService.get<boolean>('storage.minio.useSsl') ?? false;
    const accessKey =
      this.configService.get<string>('storage.minio.accessKey') ?? 'minioadmin';
    const secretKey =
      this.configService.get<string>('storage.minio.secretKey') ?? 'minioadmin';

    this.bucketName =
      this.configService.get<string>('storage.minio.bucket') ?? DEFAULT_BUCKET;
    const configuredPublicBaseUrl =
      this.configService.get<string>('storage.minio.publicBaseUrl') ?? '';
    this.publicBaseUrl =
      configuredPublicBaseUrl.trim().length > 0
        ? configuredPublicBaseUrl.trim().replace(/\/+$/, '')
        : null;
    this.autoCreateBucket =
      this.configService.get<boolean>('storage.minio.autoCreateBucket') ?? true;

    this.minioClient = new Client({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: this.useSsl,
      accessKey,
      secretKey,
    });
  }

  async storeReceipt(
    centerId: string,
    paymentId: string,
    pdf: Buffer,
  ): Promise<string> {
    await this.ensureBucketExists();

    const objectKey = this.buildObjectKey(centerId, paymentId);
    try {
      await this.minioClient.putObject(
        this.bucketName,
        objectKey,
        pdf,
        pdf.byteLength,
        {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="payment-receipt-${paymentId}.pdf"`,
          'Cache-Control': 'private, max-age=0, no-cache',
        },
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to store payment receipt for payment ${paymentId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Receipt storage is temporarily unavailable',
      );
    }

    return this.buildPublicObjectUrl(objectKey);
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (exists) {
        await this.ensurePublicReadBucketPolicy();
        return;
      }

      if (!this.autoCreateBucket) {
        throw new ServiceUnavailableException(
          `MinIO bucket "${this.bucketName}" does not exist`,
        );
      }

      await this.minioClient.makeBucket(this.bucketName);
      await this.ensurePublicReadBucketPolicy();
      this.logger.log(`Created missing MinIO bucket "${this.bucketName}"`);
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error(
        `Failed to validate MinIO bucket "${this.bucketName}"`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Receipt storage is temporarily unavailable',
      );
    }
  }

  private async ensurePublicReadBucketPolicy(): Promise<void> {
    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            AWS: ['*'],
          },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucketName}/*`],
        },
      ],
    });

    try {
      await this.minioClient.setBucketPolicy(this.bucketName, policy);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to apply public-read policy to MinIO bucket "${this.bucketName}"`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Receipt storage is temporarily unavailable',
      );
    }
  }

  private buildObjectKey(centerId: string, paymentId: string): string {
    return `centers/${centerId}/receipts/payments/${Date.now()}-${paymentId}-${randomUUID()}.pdf`;
  }

  private buildPublicObjectUrl(objectKey: string): string {
    const encodedObjectKey = objectKey
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${this.bucketName}/${encodedObjectKey}`;
    }

    const protocol = this.useSsl ? 'https' : 'http';
    return `${protocol}://${this.endpoint}:${this.port}/${this.bucketName}/${encodedObjectKey}`;
  }
}
