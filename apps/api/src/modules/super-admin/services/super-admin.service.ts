import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { SuperAdminProfileDto } from '../dto/super-admin-profile.dto';
import { SuperAdminLoginDto } from '../dto/super-admin-login.dto';
import { SuperAdminLoginResponseDto } from '../dto/super-admin-login-response.dto';
import { SUPER_ADMIN_ROLE } from '../constants/super-admin-auth.constants';
import type { SuperAdminJwtPayload } from '../types/super-admin-jwt-payload.type';

const FALLBACK_PASSWORD_HASH =
  'scrypt$5b2e9d5f0e8f4b8f8c4a7f24f2f4c1d2$246a40b72bd52d593064197989b28c50ff454518985a399b7d4ca0e78fb90f35402f6eba3ffee1289d334124a73544556638ac4941f16b8d1ec50a0f16a16615';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    payload: SuperAdminLoginDto,
  ): Promise<SuperAdminLoginResponseDto> {
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

    const expiresIn =
      this.configService.get<string>('superAdminAuth.jwtExpiresIn') ?? '1h';

    const tokenPayload: SuperAdminJwtPayload = {
      sub: superAdmin.id,
      email: superAdmin.email,
      role: SUPER_ADMIN_ROLE,
    };

    const accessToken = await this.jwtService.signAsync(tokenPayload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      superAdmin: {
        id: superAdmin.id,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        email: superAdmin.email,
      },
    };
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
}
