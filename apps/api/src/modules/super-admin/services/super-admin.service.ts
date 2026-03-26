import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { verifyPassword } from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { SuperAdminProfileDto } from '../dto/super-admin-profile.dto';
import { SuperAdminLoginDto } from '../dto/super-admin-login.dto';
import { SuperAdminLoginResponseDto } from '../dto/super-admin-login-response.dto';
import {
  SUPER_ADMIN_ACCESS_TOKEN_TYPE,
  SUPER_ADMIN_ISSUER,
  SUPER_ADMIN_REFRESH_AUDIENCE,
  SUPER_ADMIN_REFRESH_TOKEN_TYPE,
  SUPER_ADMIN_ROLE,
} from '../constants/super-admin-auth.constants';
import type { SuperAdminJwtPayload } from '../types/super-admin-jwt-payload.type';
import type { SuperAdminRefreshJwtPayload } from '../types/super-admin-refresh-jwt-payload.type';

const FALLBACK_PASSWORD_HASH =
  'scrypt$5b2e9d5f0e8f4b8f8c4a7f24f2f4c1d2$246a40b72bd52d593064197989b28c50ff454518985a399b7d4ca0e78fb90f35402f6eba3ffee1289d334124a73544556638ac4941f16b8d1ec50a0f16a16615';

export type SuperAdminAuthSession = SuperAdminLoginResponseDto & {
  refreshToken: string;
  refreshExpiresIn: string;
};

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(payload: SuperAdminLoginDto): Promise<SuperAdminAuthSession> {
    const email = payload.email.trim().toLowerCase();
    const superAdmin = await this.prismaService.superAdmin.findUnique({
      where: { email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        passwordHash: true,
        isActive: true,
      },
    });

    const isPasswordValid = await verifyPassword(
      payload.password,
      superAdmin?.passwordHash ?? FALLBACK_PASSWORD_HASH,
    );

    if (!superAdmin || !superAdmin.isActive || !isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(superAdmin);
  }

  async refresh(refreshToken: string): Promise<SuperAdminAuthSession> {
    const refreshPayload = await this.verifyRefreshToken(refreshToken);

    const superAdmin = await this.prismaService.superAdmin.findUnique({
      where: { id: refreshPayload.super_admin_id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
      },
    });

    if (
      !superAdmin ||
      !superAdmin.isActive ||
      superAdmin.email !== refreshPayload.email
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.buildAuthResponse(superAdmin);
  }

  async getProfile(superAdminId: string): Promise<SuperAdminProfileDto> {
    const superAdmin = await this.prismaService.superAdmin.findUnique({
      where: { id: superAdminId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!superAdmin || !superAdmin.isActive) {
      throw new UnauthorizedException('Invalid token');
    }

    return superAdmin;
  }

  private async buildAuthResponse(superAdmin: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<SuperAdminAuthSession> {
    const expiresIn =
      this.configService.get<string>('superAdminAuth.jwtExpiresIn') ?? '1h';
    const refreshExpiresIn = this.getRefreshExpiresIn();

    const tokenPayload: SuperAdminJwtPayload = {
      sub: superAdmin.id,
      super_admin_id: superAdmin.id,
      email: superAdmin.email,
      role: SUPER_ADMIN_ROLE,
      token_type: SUPER_ADMIN_ACCESS_TOKEN_TYPE,
    };
    const refreshPayload: SuperAdminRefreshJwtPayload = {
      sub: superAdmin.id,
      super_admin_id: superAdmin.id,
      email: superAdmin.email,
      role: SUPER_ADMIN_ROLE,
      token_type: SUPER_ADMIN_REFRESH_TOKEN_TYPE,
    };

    const accessToken = await this.jwtService.signAsync(tokenPayload);
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.getRefreshSecret(),
      expiresIn: refreshExpiresIn as StringValue,
      issuer: SUPER_ADMIN_ISSUER,
      audience: SUPER_ADMIN_REFRESH_AUDIENCE,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      refreshToken,
      refreshExpiresIn,
      superAdmin: {
        id: superAdmin.id,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        email: superAdmin.email,
      },
    };
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<SuperAdminRefreshJwtPayload> {
    try {
      const payload =
        await this.jwtService.verifyAsync<SuperAdminRefreshJwtPayload>(
          refreshToken,
          {
            secret: this.getRefreshSecret(),
            issuer: SUPER_ADMIN_ISSUER,
            audience: SUPER_ADMIN_REFRESH_AUDIENCE,
            algorithms: ['HS256'],
          },
        );

      if (
        !payload.sub ||
        !payload.super_admin_id ||
        payload.sub !== payload.super_admin_id ||
        !payload.email ||
        payload.role !== SUPER_ADMIN_ROLE ||
        payload.token_type !== SUPER_ADMIN_REFRESH_TOKEN_TYPE
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
      this.configService.get<string>('superAdminAuth.refreshJwtSecret') ??
      'change-me-refresh'
    );
  }

  private getRefreshExpiresIn(): string {
    return (
      this.configService.get<string>('superAdminAuth.refreshJwtExpiresIn') ??
      '7d'
    );
  }
}
