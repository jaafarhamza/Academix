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
  const verifyAsync = jest.fn();
  const jwtService = {
    signAsync,
    verifyAsync,
  };

  const getConfig = jest.fn();
  const configService = {
    get: getConfig,
  };

  const configMap: Record<string, string> = {
    'userAuth.jwtSecret': 'development-user-jwt-secret-change-me',
    'userAuth.jwtExpiresIn': '1h',
    'userAuth.refreshJwtSecret':
      'development-user-refresh-jwt-secret-change-me',
    'userAuth.refreshJwtExpiresIn': '7d',
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    getConfig.mockImplementation((key: string) => configMap[key]);
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

  it('returns access and refresh tokens on valid login credentials', async () => {
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
    signAsync.mockResolvedValueOnce('access-token-123');
    signAsync.mockResolvedValueOnce('refresh-token-123');

    const result = await service.login({
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'ADMIN@ACADEMIX-DEMO.COM',
      password: 'Academix.AdminUser.2026',
    });

    expect(result.accessToken).toBe('access-token-123');
    expect(result.refreshToken).toBe('refresh-token-123');
    expect(result.user.email).toBe('admin@academix-demo.com');
    expect(signAsync).toHaveBeenNthCalledWith(1, {
      sub: 'user-1',
      user_id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      token_type: 'access',
    });
    expect(signAsync).toHaveBeenNthCalledWith(
      2,
      {
        sub: 'user-1',
        user_id: 'user-1',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
        token_type: 'refresh',
      },
      {
        secret: 'development-user-refresh-jwt-secret-change-me',
        expiresIn: '7d',
        issuer: 'academix-api',
        audience: 'user-refresh',
      },
    );
  });

  it('throws UnauthorizedException on invalid login credentials', async () => {
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

  it('throws UnauthorizedException when user account is inactive on login', async () => {
    userFindUnique.mockResolvedValue({
      id: 'user-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Center',
      lastName: 'Admin',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      passwordHash: 'scrypt$hash',
      isActive: false,
    });

    jest.spyOn(passwordHashUtil, 'verifyPassword').mockResolvedValueOnce(true);

    await expect(
      service.login({
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        email: 'admin@academix-demo.com',
        password: 'Academix.AdminUser.2026',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when user does not exist on login', async () => {
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

  it('returns rotated access and refresh tokens for valid refresh token', async () => {
    verifyAsync.mockResolvedValue({
      sub: 'user-1',
      user_id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      token_type: 'refresh',
    });
    userFindUnique.mockResolvedValue({
      id: 'user-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Center',
      lastName: 'Admin',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      isActive: true,
    });
    signAsync.mockResolvedValueOnce('new-access-token-123');
    signAsync.mockResolvedValueOnce('new-refresh-token-123');

    const result = await service.refresh({
      refreshToken: 'valid-refresh-token',
    });

    expect(result.accessToken).toBe('new-access-token-123');
    expect(result.refreshToken).toBe('new-refresh-token-123');
    expect(verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
      secret: 'development-user-refresh-jwt-secret-change-me',
      issuer: 'academix-api',
      audience: 'user-refresh',
      algorithms: ['HS256'],
    });
  });

  it('throws UnauthorizedException when refresh token is invalid', async () => {
    verifyAsync.mockRejectedValueOnce(new Error('jwt malformed'));

    await expect(
      service.refresh({
        refreshToken: 'invalid-refresh-token',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when refresh payload has invalid token_type', async () => {
    verifyAsync.mockResolvedValueOnce({
      sub: 'user-1',
      user_id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      token_type: 'access',
    });

    await expect(
      service.refresh({
        refreshToken: 'invalid-token-type',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when refreshed user does not exist', async () => {
    verifyAsync.mockResolvedValueOnce({
      sub: 'user-404',
      user_id: 'user-404',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'missing@academix-demo.com',
      role: 'ADMIN',
      token_type: 'refresh',
    });
    userFindUnique.mockResolvedValueOnce(null);

    await expect(
      service.refresh({
        refreshToken: 'valid-refresh-for-missing-user',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when refreshed user context mismatches payload', async () => {
    verifyAsync.mockResolvedValueOnce({
      sub: 'user-1',
      user_id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      token_type: 'refresh',
    });
    userFindUnique.mockResolvedValueOnce({
      id: 'user-1',
      centerId: '9f9b8c0f-5f9d-4ab2-aabf-efd74e0a4aaa',
      firstName: 'Center',
      lastName: 'Admin',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      isActive: true,
    });

    await expect(
      service.refresh({
        refreshToken: 'valid-refresh-with-mismatched-context',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
