import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import {
  hashPassword,
  verifyPassword,
} from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  CENTER_ACCESS_TOKEN_TYPE,
  CENTER_ADMIN_ROLE,
  CENTER_ISSUER,
  CENTER_REFRESH_AUDIENCE,
  CENTER_REFRESH_TOKEN_TYPE,
} from '../constants/center-auth.constants';
import { CenterLogoUploadResponseDto } from '../dto/center-logo-upload-response.dto';
import { CenterLoginDto } from '../dto/center-login.dto';
import { CenterLoginResponseDto } from '../dto/center-login-response.dto';
import { CenterProfileDto } from '../dto/center-profile.dto';
import { ChangeCenterPasswordDto } from '../dto/change-center-password.dto';
import { RegisterCenterDto } from '../dto/register-center.dto';
import { RegisterCenterResponseDto } from '../dto/register-center-response.dto';
import { UpdateCenterProfileDto } from '../dto/update-center-profile.dto';
import type { CenterJwtPayload } from '../types/center-jwt-payload.type';
import type { CenterRefreshJwtPayload } from '../types/center-refresh-jwt-payload.type';
import {
  CenterLogoStorageService,
  type UploadableCenterLogo,
} from './center-logo-storage.service';
import {
  buildSubdomainCandidate,
  slugifyCenterName,
} from '../utils/subdomain.util';

const MAX_SUBDOMAIN_RETRY_ATTEMPTS = 50;
const FALLBACK_PASSWORD_HASH =
  'scrypt$5b2e9d5f0e8f4b8f8c4a7f24f2f4c1d2$246a40b72bd52d593064197989b28c50ff454518985a399b7d4ca0e78fb90f35402f6eba3ffee1289d334124a73544556638ac4941f16b8d1ec50a0f16a16615';

export type CenterAuthSession = CenterLoginResponseDto & {
  refreshToken: string;
  refreshExpiresIn: string;
};

@Injectable()
export class CenterService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly centerLogoStorageService: CenterLogoStorageService,
  ) {}

  async login(payload: CenterLoginDto): Promise<CenterAuthSession> {
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

    return this.buildAuthResponse(center);
  }

  async refresh(refreshToken: string): Promise<CenterAuthSession> {
    const refreshPayload = await this.verifyRefreshToken(refreshToken);

    const center = await this.prismaService.center.findUnique({
      where: { id: refreshPayload.center_id },
      select: {
        id: true,
        centerName: true,
        email: true,
        subdomain: true,
        isActive: true,
      },
    });

    if (
      !center ||
      !center.isActive ||
      center.email !== refreshPayload.email ||
      center.subdomain !== refreshPayload.subdomain
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.buildAuthResponse(center);
  }

  async getProfile(centerId: string): Promise<CenterProfileDto> {
    const center = await this.prismaService.center.findUnique({
      where: { id: centerId },
      select: this.getCenterProfileSelect(),
    });

    if (!center || !center.isActive) {
      throw new UnauthorizedException('Invalid token');
    }

    return center;
  }

  async updateProfile(
    centerId: string,
    payload: UpdateCenterProfileDto,
  ): Promise<CenterProfileDto> {
    const existingCenter = await this.prismaService.center.findUnique({
      where: { id: centerId },
      select: this.getCenterProfileSelect(),
    });

    if (!existingCenter || !existingCenter.isActive) {
      throw new UnauthorizedException('Invalid token');
    }

    const data = this.buildCenterProfileUpdateData(payload);

    if (Object.keys(data).length === 0) {
      return existingCenter;
    }

    try {
      return await this.prismaService.center.update({
        where: { id: centerId },
        data,
        select: this.getCenterProfileSelect(),
      });
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const target = this.getUniqueConstraintTarget(error);
      if (target.includes('email')) {
        throw new ConflictException('Center email already in use');
      }

      throw new ConflictException(
        'Center already exists with the provided unique fields',
      );
    }
  }

  async uploadLogo(
    centerId: string,
    file: UploadableCenterLogo,
  ): Promise<CenterLogoUploadResponseDto> {
    const center = await this.prismaService.center.findUnique({
      where: { id: centerId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!center || !center.isActive) {
      throw new UnauthorizedException('Invalid token');
    }

    const logoUrl = await this.centerLogoStorageService.uploadCenterLogo(
      center.id,
      file,
    );

    await this.prismaService.center.update({
      where: { id: center.id },
      data: { logoUrl },
    });

    return {
      logoUrl,
    };
  }

  async changePassword(
    centerId: string,
    payload: ChangeCenterPasswordDto,
  ): Promise<void> {
    const center = await this.prismaService.center.findUnique({
      where: { id: centerId },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!center || !center.isActive) {
      throw new UnauthorizedException('Invalid token');
    }

    const isCurrentPasswordValid = await verifyPassword(
      payload.currentPassword,
      center.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    if (payload.newPassword !== payload.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match');
    }

    if (payload.currentPassword === payload.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const passwordHash = await hashPassword(payload.newPassword);

    await this.prismaService.center.update({
      where: {
        id: centerId,
      },
      data: {
        passwordHash,
      },
    });
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

  private async buildAuthResponse(center: {
    id: string;
    centerName: string;
    email: string;
    subdomain: string;
  }): Promise<CenterAuthSession> {
    const expiresIn =
      this.configService.get<string>('centerAuth.jwtExpiresIn') ?? '1h';
    const refreshExpiresIn = this.getRefreshExpiresIn();

    const accessPayload: CenterJwtPayload = {
      sub: center.id,
      center_id: center.id,
      email: center.email,
      role: CENTER_ADMIN_ROLE,
      subdomain: center.subdomain,
      token_type: CENTER_ACCESS_TOKEN_TYPE,
    };

    const refreshPayload: CenterRefreshJwtPayload = {
      sub: center.id,
      center_id: center.id,
      email: center.email,
      role: CENTER_ADMIN_ROLE,
      subdomain: center.subdomain,
      token_type: CENTER_REFRESH_TOKEN_TYPE,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload);
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.getRefreshSecret(),
      expiresIn: refreshExpiresIn as StringValue,
      issuer: CENTER_ISSUER,
      audience: CENTER_REFRESH_AUDIENCE,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      refreshToken,
      refreshExpiresIn,
      center: {
        id: center.id,
        centerName: center.centerName,
        email: center.email,
        subdomain: center.subdomain,
        role: CENTER_ADMIN_ROLE,
      },
    };
  }

  private getCenterProfileSelect() {
    return {
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
    };
  }

  private buildCenterProfileUpdateData(payload: UpdateCenterProfileDto) {
    const data: CenterProfileUpdateData = {};

    if (payload.firstName !== undefined) {
      data.firstName = payload.firstName;
    }
    if (payload.lastName !== undefined) {
      data.lastName = payload.lastName;
    }
    if (payload.centerName !== undefined) {
      data.centerName = payload.centerName;
    }
    if (payload.email !== undefined) {
      data.email = payload.email;
    }
    if (payload.phone !== undefined) {
      data.phone = payload.phone;
    }

    return data;
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<CenterRefreshJwtPayload> {
    try {
      const payload =
        await this.jwtService.verifyAsync<CenterRefreshJwtPayload>(
          refreshToken,
          {
            secret: this.getRefreshSecret(),
            issuer: CENTER_ISSUER,
            audience: CENTER_REFRESH_AUDIENCE,
            algorithms: ['HS256'],
          },
        );

      if (
        !payload.sub ||
        !payload.center_id ||
        payload.sub !== payload.center_id ||
        !payload.email ||
        !payload.subdomain ||
        payload.role !== CENTER_ADMIN_ROLE ||
        payload.token_type !== CENTER_REFRESH_TOKEN_TYPE
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private getRefreshSecret(): string {
    return (
      this.configService.get<string>('centerAuth.refreshJwtSecret') ??
      'change-me-refresh'
    );
  }

  private getRefreshExpiresIn(): string {
    return (
      this.configService.get<string>('centerAuth.refreshJwtExpiresIn') ?? '7d'
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

type CenterProfileUpdateData = {
  firstName?: string;
  lastName?: string;
  centerName?: string;
  email?: string;
  phone?: string;
};
