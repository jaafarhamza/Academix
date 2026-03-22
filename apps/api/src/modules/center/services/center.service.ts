import { ConflictException, Injectable } from '@nestjs/common';
import { hashPassword } from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { RegisterCenterDto } from '../dto/register-center.dto';
import { RegisterCenterResponseDto } from '../dto/register-center-response.dto';

@Injectable()
export class CenterService {
  constructor(private readonly prismaService: PrismaService) {}

  async register(
    payload: RegisterCenterDto,
    superAdminId: string,
  ): Promise<RegisterCenterResponseDto> {
    const existingCenterWithEmail = await this.prismaService.center.findUnique({
      where: { email: payload.email },
      select: { id: true },
    });

    if (existingCenterWithEmail) {
      throw new ConflictException('Center email already in use');
    }

    const baseSubdomain = this.toSubdomainBase(payload.centerName);
    const subdomain = await this.generateUniqueSubdomain(baseSubdomain);
    const passwordHash = await hashPassword(payload.password);

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
      if (this.isUniqueConstraintError(error)) {
        const target = this.getUniqueConstraintTarget(error);
        if (target.includes('email')) {
          throw new ConflictException('Center email already in use');
        }
        if (target.includes('subdomain')) {
          throw new ConflictException('Center subdomain already in use');
        }
        throw new ConflictException(
          'Center already exists with the provided unique fields',
        );
      }
      throw error;
    }
  }

  private toSubdomainBase(centerName: string): string {
    const normalized = centerName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const slug = normalized
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    const fallback = slug || 'center';
    return fallback.slice(0, 63);
  }

  private async generateUniqueSubdomain(
    baseSubdomain: string,
  ): Promise<string> {
    let attempt = 0;

    while (true) {
      const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
      const truncatedBase = baseSubdomain.slice(0, 63 - suffix.length);
      const candidate = `${truncatedBase}${suffix}`;

      const existingCenter = await this.prismaService.center.findUnique({
        where: { subdomain: candidate },
        select: { id: true },
      });

      if (!existingCenter) {
        return candidate;
      }

      attempt += 1;
    }
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
