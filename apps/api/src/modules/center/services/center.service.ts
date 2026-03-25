import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  hashPassword,
  verifyPassword,
} from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CENTER_ADMIN_ROLE } from '../constants/center-auth.constants';
import { CenterLoginDto } from '../dto/center-login.dto';
import { CenterLoginResponseDto } from '../dto/center-login-response.dto';
import { RegisterCenterDto } from '../dto/register-center.dto';
import { RegisterCenterResponseDto } from '../dto/register-center-response.dto';
import type { CenterJwtPayload } from '../types/center-jwt-payload.type';
import {
  buildSubdomainCandidate,
  slugifyCenterName,
} from '../utils/subdomain.util';

const MAX_SUBDOMAIN_RETRY_ATTEMPTS = 50;
const FALLBACK_PASSWORD_HASH =
  'scrypt$5b2e9d5f0e8f4b8f8c4a7f24f2f4c1d2$246a40b72bd52d593064197989b28c50ff454518985a399b7d4ca0e78fb90f35402f6eba3ffee1289d334124a73544556638ac4941f16b8d1ec50a0f16a16615';

@Injectable()
export class CenterService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(payload: CenterLoginDto): Promise<CenterLoginResponseDto> {
    const email = payload.email.trim().toLowerCase();
    const center = await this.prismaService.center.findUnique({
      where: { email },
      select: {
        id: true,
        centerName: true,
        email: true,
        passwordHash: true,
        subdomain: true,
        isActive: true,
      },
    });

    const isPasswordValid = await verifyPassword(
      payload.password,
      center?.passwordHash ?? FALLBACK_PASSWORD_HASH,
    );

    if (!center || !center.isActive || !isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const expiresIn =
      this.configService.get<string>('centerAuth.jwtExpiresIn') ?? '1h';

    const tokenPayload: CenterJwtPayload = {
      sub: center.id,
      center_id: center.id,
      email: center.email,
      role: CENTER_ADMIN_ROLE,
      subdomain: center.subdomain,
    };

    const accessToken = await this.jwtService.signAsync(tokenPayload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      center: {
        id: center.id,
        centerName: center.centerName,
        email: center.email,
        subdomain: center.subdomain,
        role: CENTER_ADMIN_ROLE,
      },
    };
  }

  async register(
    payload: RegisterCenterDto,
  ): Promise<RegisterCenterResponseDto> {
    const superAdminId = await this.resolveRegistrationSuperAdminId();
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

  private async resolveRegistrationSuperAdminId(): Promise<string> {
    const configuredEmail = (
      this.configService.get<string>('superAdminBootstrap.email') ?? ''
    )
      .trim()
      .toLowerCase();

    if (configuredEmail) {
      const configuredSuperAdmin =
        await this.prismaService.superAdmin.findUnique({
          where: { email: configuredEmail },
          select: { id: true, isActive: true },
        });

      if (configuredSuperAdmin?.isActive) {
        return configuredSuperAdmin.id;
      }
    }

    const fallbackSuperAdmin = await this.prismaService.superAdmin.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (fallbackSuperAdmin) {
      return fallbackSuperAdmin.id;
    }

    throw new ServiceUnavailableException(
      'Center registration is temporarily unavailable. Please contact support.',
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
