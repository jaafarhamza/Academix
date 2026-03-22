import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  SUPER_ADMIN_AUDIENCE,
  SUPER_ADMIN_ISSUER,
  SUPER_ADMIN_JWT_STRATEGY,
} from '../constants/super-admin-auth.constants';
import type { AuthenticatedSuperAdmin } from '../types/authenticated-super-admin.type';
import type { SuperAdminJwtPayload } from '../types/super-admin-jwt-payload.type';

@Injectable()
export class SuperAdminJwtStrategy extends PassportStrategy(
  Strategy,
  SUPER_ADMIN_JWT_STRATEGY,
) {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('superAdminAuth.jwtSecret') ?? 'change-me',
      issuer: SUPER_ADMIN_ISSUER,
      audience: SUPER_ADMIN_AUDIENCE,
    });
  }

  async validate(
    payload: SuperAdminJwtPayload,
  ): Promise<AuthenticatedSuperAdmin> {
    const superAdmin = await this.prismaService.superAdmin.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });

    if (
      !superAdmin ||
      !superAdmin.isActive ||
      superAdmin.email !== payload.email
    ) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      id: superAdmin.id,
      email: superAdmin.email,
      role: 'SUPER_ADMIN',
    };
  }
}
