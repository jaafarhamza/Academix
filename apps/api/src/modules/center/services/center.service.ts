import { ConflictException, Injectable } from '@nestjs/common';
import { hashPassword } from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { RegisterCenterDto } from '../dto/register-center.dto';
import { RegisterCenterResponseDto } from '../dto/register-center-response.dto';
import {
  buildSubdomainCandidate,
  slugifyCenterName,
} from '../utils/subdomain.util';

const MAX_SUBDOMAIN_RETRY_ATTEMPTS = 50;

@Injectable()
export class CenterService {
  constructor(private readonly prismaService: PrismaService) {}

  async register(
    payload: RegisterCenterDto,
    superAdminId: string,
  ): Promise<RegisterCenterResponseDto> {
    const baseSubdomain = slugifyCenterName(payload.centerName);
    const passwordHash = await hashPassword(payload.password);

    for (
      let attempt = 0;
      attempt < MAX_SUBDOMAIN_RETRY_ATTEMPTS;
      attempt += 1
    ) {
      const subdomain = buildSubdomainCandidate(baseSubdomain, attempt);

      try {
        return await this.prismaService.center.create({
          data: {
            superAdminId,
            firstName: payload.firstName,
            lastName: payload.lastName,
            centerName: payload.centerName,
            email: payload.email,
            passwordHash,
            phone: payload.phone,
            logoUrl: payload.logoUrl ?? null,
            subdomain,
          },
          select: {
            id: true,
            superAdminId: true,
            firstName: true,
            lastName: true,
            centerName: true,
            email: true,
            phone: true,
            logoUrl: true,
            subdomain: true,
            isActive: true,
            createdAt: true,
          },
        });
      } catch (error: unknown) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }

        const target = this.getUniqueConstraintTarget(error);
        if (target.includes('email')) {
          throw new ConflictException('Center email already in use');
        }

        if (target.includes('subdomain')) {
          continue;
        }

        throw new ConflictException(
          'Center already exists with the provided unique fields',
        );
      }
    }

    throw new ConflictException(
      'Unable to generate a unique center subdomain. Please try another center name.',
    );
  }

  private isUniqueConstraintError(error: unknown): error is {
    code: 'P2002';
    meta?: { target?: unknown };
  } {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const record = error as { code?: unknown };
    return record.code === 'P2002';
  }

  private getUniqueConstraintTarget(error: {
    meta?: { target?: unknown };
  }): string {
    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.map((value) => String(value).toLowerCase()).join(',');
    }

    return typeof target === 'string' ? target.toLowerCase() : '';
  }
}
