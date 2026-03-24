import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { RequestContextService } from '../../common/services/request-context.service';
import { PrismaClient } from '../../generated/prisma/client';
import { createTenantQueryExtension } from './tenant-prisma-extension.util';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly tenantAwareClient: PrismaClient;

  constructor(private readonly requestContextService: RequestContextService) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    const adapter = new PrismaPg({ connectionString: databaseUrl });
    super({ adapter });

    const tenantAwareClient = this.$extends(
      createTenantQueryExtension(() =>
        this.requestContextService.getCenterId(),
      ),
    ) as PrismaClient;
    this.tenantAwareClient = tenantAwareClient;

    return new Proxy(this, {
      get: (target, property, receiver): unknown => {
        if (this.shouldResolveFromService(property)) {
          return Reflect.get(target, property, receiver) as unknown;
        }

        return Reflect.get(
          tenantAwareClient as unknown as object,
          property,
          receiver,
        ) as unknown;
      },
    }) as PrismaService;
  }

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await this.tenantAwareClient.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.tenantAwareClient.$disconnect();
  }

  private shouldResolveFromService(property: PropertyKey): boolean {
    return (
      property === 'onModuleInit' ||
      property === 'onModuleDestroy' ||
      property === 'tenantAwareClient' ||
      property === 'requestContextService' ||
      property === 'shouldResolveFromService'
    );
  }
}
