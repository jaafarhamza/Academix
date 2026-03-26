import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  SUPER_ADMIN_ACCESS_TOKEN_TYPE,
  SUPER_ADMIN_AUDIENCE,
  SUPER_ADMIN_ISSUER,
  SUPER_ADMIN_JWT_STRATEGY,
  SUPER_ADMIN_ROLE,
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
      algorithms: ['HS256'],
      secretOrKey:
        configService.get<string>('superAdminAuth.jwtSecret') ?? 'change-me',
      issuer: SUPER_ADMIN_ISSUER,
      audience: SUPER_ADMIN_AUDIENCE,
    });
  }

  async validate(
    payload: SuperAdminJwtPayload,
  ): Promise<AuthenticatedSuperAdmin> {
    if (
      payload.role !== SUPER_ADMIN_ROLE ||
      !payload.sub ||
      !payload.super_admin_id ||
      payload.sub !== payload.super_admin_id ||
      !payload.email ||
      payload.token_type !== SUPER_ADMIN_ACCESS_TOKEN_TYPE
    ) {
      throw new UnauthorizedException('Invalid token');
    }

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
      role: SUPER_ADMIN_ROLE,
    };
  }
}
