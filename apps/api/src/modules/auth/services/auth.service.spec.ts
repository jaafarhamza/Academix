import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import * as passwordHashUtil from '../../../common/utils/password-hash.util';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const userFindUnique = jest.fn();
  const prismaService = {
    user: {
      findUnique: userFindUnique,
    },
  };

  const signAsync = jest.fn();
  const jwtService = {
    signAsync,
  };

  const getConfig = jest.fn();
  const configService = {
    get: getConfig,
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prismaService as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('returns auth module readiness status', () => {
    const status = service.getStatus();

    expect(status).toEqual({
      module: 'auth',
      status: 'ready',
    });
  });

  it('returns access token on valid credentials', async () => {
    userFindUnique.mockResolvedValue({
      id: 'user-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Center',
      lastName: 'Admin',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      passwordHash: 'scrypt$hash',
      isActive: true,
    });

    jest.spyOn(passwordHashUtil, 'verifyPassword').mockResolvedValueOnce(true);
    signAsync.mockResolvedValueOnce('token-123');
    getConfig.mockReturnValueOnce('1h');

    const result = await service.login({
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'ADMIN@ACADEMIX-DEMO.COM',
      password: 'Academix.AdminUser.2026',
    });

    expect(result.accessToken).toBe('token-123');
    expect(result.user.email).toBe('admin@academix-demo.com');
    expect(result.user.center_id).toBe('2cc4267d-f618-478f-aa2f-9699ecbe332f');
    expect(userFindUnique).toHaveBeenCalledWith({
      where: {
        centerId_email: {
          centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
          email: 'admin@academix-demo.com',
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
    expect(signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      user_id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
    });
  });

  it('throws UnauthorizedException on invalid credentials', async () => {
    userFindUnique.mockResolvedValue({
      id: 'user-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Center',
      lastName: 'Admin',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      passwordHash: 'scrypt$hash',
      isActive: true,
    });

    jest.spyOn(passwordHashUtil, 'verifyPassword').mockResolvedValueOnce(false);

    await expect(
      service.login({
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        email: 'admin@academix-demo.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when user does not exist', async () => {
    userFindUnique.mockResolvedValue(null);
    jest.spyOn(passwordHashUtil, 'verifyPassword').mockResolvedValueOnce(false);

    await expect(
      service.login({
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        email: 'missing@academix-demo.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
