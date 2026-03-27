import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  CENTER_ACCESS_TOKEN_TYPE,
  CENTER_ADMIN_ROLE,
  CENTER_AUDIENCE,
  CENTER_ISSUER,
  CENTER_JWT_STRATEGY,
} from '../constants/center-auth.constants';
import type { AuthenticatedCenterAdmin } from '../types/authenticated-center-admin.type';
import type { CenterJwtPayload } from '../types/center-jwt-payload.type';

@Injectable()
export class CenterJwtStrategy extends PassportStrategy(
  Strategy,
  CENTER_JWT_STRATEGY,
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
        configService.get<string>('centerAuth.jwtSecret') ?? 'change-me',
      issuer: CENTER_ISSUER,
      audience: CENTER_AUDIENCE,
    });
  }

  async validate(payload: CenterJwtPayload): Promise<AuthenticatedCenterAdmin> {
    if (
      !payload.sub ||
      !payload.center_id ||
      payload.sub !== payload.center_id ||
      !payload.email ||
      !payload.subdomain ||
      payload.role !== CENTER_ADMIN_ROLE ||
      payload.token_type !== CENTER_ACCESS_TOKEN_TYPE
    ) {
      throw new UnauthorizedException('Invalid token');
    }

    const center = await this.prismaService.center.findUnique({
      where: { id: payload.center_id },
      select: {
        id: true,
        email: true,
        subdomain: true,
        isActive: true,
      },
    });

    if (
      !center ||
      !center.isActive ||
      center.email !== payload.email ||
      center.subdomain !== payload.subdomain
    ) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      id: center.id,
      center_id: center.id,
      email: center.email,
      role: CENTER_ADMIN_ROLE,
      subdomain: center.subdomain,
    };
  }
}
