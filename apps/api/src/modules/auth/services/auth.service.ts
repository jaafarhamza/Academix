import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { verifyPassword } from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  USER_ACCESS_TOKEN_TYPE,
  USER_AUTH_ISSUER,
  USER_REFRESH_AUDIENCE,
  USER_REFRESH_TOKEN_TYPE,
} from '../constants/user-auth.constants';
import { AuthStatusResponseDto } from '../dto/auth-status-response.dto';
import { UserLoginDto } from '../dto/user-login.dto';
import { UserLoginResponseDto } from '../dto/user-login-response.dto';
import type { UserJwtPayload } from '../types/user-jwt-payload.type';
import type { UserRefreshJwtPayload } from '../types/user-refresh-jwt-payload.type';

const FALLBACK_PASSWORD_HASH =
  'scrypt$5b2e9d5f0e8f4b8f8c4a7f24f2f4c1d2$246a40b72bd52d593064197989b28c50ff454518985a399b7d4ca0e78fb90f35402f6eba3ffee1289d334124a73544556638ac4941f16b8d1ec50a0f16a16615';

export type UserAuthSession = UserLoginResponseDto & {
  refreshToken: string;
  refreshExpiresIn: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(payload: UserLoginDto): Promise<UserAuthSession> {
    const centerId = payload.center_id.trim();
    const email = payload.email.trim().toLowerCase();

    const user = await this.prismaService.user.findUnique({
      where: {
        centerId_email: {
          centerId,
          email,
        },
      },
      select: {
        id: true,
        centerId: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        passwordHash: true,
        isActive: true,
      },
    });

    const isPasswordValid = await verifyPassword(
      payload.password,
      user?.passwordHash ?? FALLBACK_PASSWORD_HASH,
    );

    if (!user || !user.isActive || !isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string): Promise<UserAuthSession> {
    const refreshPayload = await this.verifyRefreshToken(refreshToken);

    const user = await this.prismaService.user.findUnique({
      where: { id: refreshPayload.user_id },
      select: {
        id: true,
        centerId: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      user.centerId !== refreshPayload.center_id ||
      user.email !== refreshPayload.email ||
      user.role !== refreshPayload.role
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.buildAuthResponse(user);
  }

  getStatus(): AuthStatusResponseDto {
    return {
      module: 'auth',
      status: 'ready',
    };
  }

  private async buildAuthResponse(user: {
    id: string;
    centerId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserJwtPayload['role'];
  }): Promise<UserAuthSession> {
    const expiresIn = this.configService.get<string>('userAuth.jwtExpiresIn');
    const refreshExpiresIn = this.getRefreshExpiresIn();

    const accessPayload: UserJwtPayload = {
      sub: user.id,
      user_id: user.id,
      center_id: user.centerId,
      email: user.email,
      role: user.role,
      token_type: USER_ACCESS_TOKEN_TYPE,
    };

    const refreshPayload: UserRefreshJwtPayload = {
      sub: user.id,
      user_id: user.id,
      center_id: user.centerId,
      email: user.email,
      role: user.role,
      token_type: USER_REFRESH_TOKEN_TYPE,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload);
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.getRefreshSecret(),
      expiresIn: refreshExpiresIn as StringValue,
      issuer: USER_AUTH_ISSUER,
      audience: USER_REFRESH_AUDIENCE,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: expiresIn ?? '1h',
      refreshToken,
      refreshExpiresIn,
      user: {
        id: user.id,
        center_id: user.centerId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<UserRefreshJwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<UserRefreshJwtPayload>(
        refreshToken,
        {
          secret: this.getRefreshSecret(),
          issuer: USER_AUTH_ISSUER,
          audience: USER_REFRESH_AUDIENCE,
          algorithms: ['HS256'],
        },
      );

      if (
        !payload.user_id ||
        !payload.center_id ||
        !payload.role ||
        !payload.email ||
        !payload.sub ||
        payload.sub !== payload.user_id ||
        payload.token_type !== USER_REFRESH_TOKEN_TYPE
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
      this.configService.get<string>('userAuth.refreshJwtSecret') ??
      'change-me-refresh'
    );
  }

  private getRefreshExpiresIn(): string {
    return (
      this.configService.get<string>('userAuth.refreshJwtExpiresIn') ?? '7d'
    );
  }
}
