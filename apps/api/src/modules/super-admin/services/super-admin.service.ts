import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { SuperAdminProfileDto } from '../dto/super-admin-profile.dto';
import { SuperAdminLoginDto } from '../dto/super-admin-login.dto';
import { SuperAdminLoginResponseDto } from '../dto/super-admin-login-response.dto';
import type { SuperAdminJwtPayload } from '../types/super-admin-jwt-payload.type';

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

    if (!superAdmin || !superAdmin.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await verifyPassword(
      payload.password,
      superAdmin.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const expiresIn =
      this.configService.get<string>('superAdminAuth.jwtExpiresIn') ?? '1h';

    const tokenPayload: SuperAdminJwtPayload = {
      sub: superAdmin.id,
      email: superAdmin.email,
      role: 'SUPER_ADMIN',
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
