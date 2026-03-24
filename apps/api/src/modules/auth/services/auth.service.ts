import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuthStatusResponseDto } from '../dto/auth-status-response.dto';
import { UserLoginDto } from '../dto/user-login.dto';
import { UserLoginResponseDto } from '../dto/user-login-response.dto';
import type { UserJwtPayload } from '../types/user-jwt-payload.type';

const FALLBACK_PASSWORD_HASH =
  'scrypt$5b2e9d5f0e8f4b8f8c4a7f24f2f4c1d2$246a40b72bd52d593064197989b28c50ff454518985a399b7d4ca0e78fb90f35402f6eba3ffee1289d334124a73544556638ac4941f16b8d1ec50a0f16a16615';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(payload: UserLoginDto): Promise<UserLoginResponseDto> {
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

    const expiresIn = this.configService.get<string>('userAuth.jwtExpiresIn');
    const tokenPayload: UserJwtPayload = {
      sub: user.id,
      user_id: user.id,
      center_id: user.centerId,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(tokenPayload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: expiresIn ?? '1h',
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

  getStatus(): AuthStatusResponseDto {
    return {
      module: 'auth',
      status: 'ready',
    };
  }
}
