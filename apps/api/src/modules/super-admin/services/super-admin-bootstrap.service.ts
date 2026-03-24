import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hashPassword } from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';

type PrismaKnownError = {
  code?: unknown;
};

@Injectable()
export class SuperAdminBootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const isEnabled =
      this.configService.get<boolean>('superAdminBootstrap.enabled') ?? false;
    if (!isEnabled) {
      return;
    }

    const existingCount = await this.prismaService.superAdmin.count();
    if (existingCount > 0) {
      return;
    }

    const email = this.getRequiredConfig(
      'superAdminBootstrap.email',
      'Default super admin email is missing',
    );
    const password = this.getRequiredConfig(
      'superAdminBootstrap.password',
      'Default super admin password is missing',
    );
    const firstName = this.getRequiredConfig(
      'superAdminBootstrap.firstName',
      'Default super admin first name is missing',
    );
    const lastName = this.getRequiredConfig(
      'superAdminBootstrap.lastName',
      'Default super admin last name is missing',
    );
    const phone = this.getRequiredConfig(
      'superAdminBootstrap.phone',
      'Default super admin phone is missing',
    );

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await hashPassword(password);

    try {
      await this.prismaService.superAdmin.create({
        data: {
          firstName,
          lastName,
          email: normalizedEmail,
          phone,
          passwordHash,
          isActive: true,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        return;
      }
      throw error;
    }
  }

  private getRequiredConfig(configKey: string, errorMessage: string): string {
    const value = this.configService.get<string>(configKey);
    if (!value || value.trim().length === 0) {
      throw new Error(errorMessage);
    }

    return value.trim();
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const record = error as PrismaKnownError;
    return record.code === 'P2002';
  }
}
