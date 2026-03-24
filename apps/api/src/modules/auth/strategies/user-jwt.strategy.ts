import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  USER_ACCESS_TOKEN_TYPE,
  USER_AUTH_AUDIENCE,
  USER_AUTH_ISSUER,
  USER_JWT_STRATEGY,
} from '../constants/user-auth.constants';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import type { UserJwtPayload } from '../types/user-jwt-payload.type';

@Injectable()
export class UserJwtStrategy extends PassportStrategy(
  Strategy,
  USER_JWT_STRATEGY,
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
        configService.get<string>('userAuth.jwtSecret') ?? 'change-me',
      issuer: USER_AUTH_ISSUER,
      audience: USER_AUTH_AUDIENCE,
    });
  }

  async validate(payload: UserJwtPayload): Promise<AuthenticatedUser> {
    if (
      !payload.user_id ||
      !payload.center_id ||
      !payload.role ||
      !payload.email ||
      payload.token_type !== USER_ACCESS_TOKEN_TYPE ||
      !payload.sub ||
      payload.sub !== payload.user_id
    ) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.user_id },
      select: {
        id: true,
        centerId: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      user.centerId !== payload.center_id ||
      user.role !== payload.role ||
      user.email !== payload.email
    ) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      id: user.id,
      center_id: user.centerId,
      email: user.email,
      role: user.role,
    };
  }
}
