import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import * as passwordHashUtil from '../../../common/utils/password-hash.util';
import { SuperAdminService } from './super-admin.service';

describe('SuperAdminService', () => {
  const superAdminFindUnique = jest.fn();
  const prismaService = {
    superAdmin: {
      findUnique: superAdminFindUnique,
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
  const configMap: Record<string, unknown> = {
    'superAdminAuth.jwtExpiresIn': '1h',
    'superAdminAuth.refreshJwtSecret':
      'development-super-admin-refresh-jwt-secret-change-me',
    'superAdminAuth.refreshJwtExpiresIn': '7d',
  };

  let service: SuperAdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    getConfig.mockImplementation((key: string) => configMap[key]);
    service = new SuperAdminService(
      prismaService as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('returns access token on valid credentials', async () => {
    superAdminFindUnique.mockResolvedValue({
      id: 'sa-1',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@academix.com',
      passwordHash: 'scrypt$hash',
      isActive: true,
    });

    jest.spyOn(passwordHashUtil, 'verifyPassword').mockResolvedValueOnce(true);
    signAsync
      .mockResolvedValueOnce('access-token-123')
      .mockResolvedValueOnce('refresh-token-123');

    const result = await service.login({
      email: 'SUPERADMIN@ACADEMIX.COM',
      password: 'Academix.SuperAdmin.2026',
    });

    expect(result.accessToken).toBe('access-token-123');
    expect(result.refreshToken).toBe('refresh-token-123');
    expect(result.refreshExpiresIn).toBe('7d');
    expect(result.superAdmin.email).toBe('superadmin@academix.com');
    expect(signAsync).toHaveBeenCalledWith({
      sub: 'sa-1',
      super_admin_id: 'sa-1',
      email: 'superadmin@academix.com',
      role: 'SUPER_ADMIN',
      token_type: 'access',
    });
    expect(signAsync).toHaveBeenCalledWith(
      {
        sub: 'sa-1',
        super_admin_id: 'sa-1',
        email: 'superadmin@academix.com',
        role: 'SUPER_ADMIN',
        token_type: 'refresh',
      },
      expect.objectContaining({
        secret: 'development-super-admin-refresh-jwt-secret-change-me',
        expiresIn: '7d',
      }),
    );
  });

  it('issues fresh tokens on valid refresh token', async () => {
    verifyAsync.mockResolvedValueOnce({
      sub: 'sa-1',
      super_admin_id: 'sa-1',
      email: 'superadmin@academix.com',
      role: 'SUPER_ADMIN',
      token_type: 'refresh',
    });
    superAdminFindUnique.mockResolvedValueOnce({
      id: 'sa-1',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@academix.com',
      isActive: true,
    });
    signAsync
      .mockResolvedValueOnce('next-access-token')
      .mockResolvedValueOnce('next-refresh-token');

    const result = await service.refresh('valid-refresh-token');

    expect(result.accessToken).toBe('next-access-token');
    expect(result.refreshToken).toBe('next-refresh-token');
    expect(verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
      secret: 'development-super-admin-refresh-jwt-secret-change-me',
      issuer: 'academix-api',
      audience: 'super-admin-refresh',
      algorithms: ['HS256'],
    });
  });

  it('throws UnauthorizedException on invalid credentials', async () => {
    superAdminFindUnique.mockResolvedValue({
      id: 'sa-1',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@academix.com',
      passwordHash: 'scrypt$hash',
      isActive: true,
    });

    jest.spyOn(passwordHashUtil, 'verifyPassword').mockResolvedValueOnce(false);

    await expect(
      service.login({
        email: 'superadmin@academix.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when super admin account is inactive', async () => {
    superAdminFindUnique.mockResolvedValue({
      id: 'sa-1',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@academix.com',
      passwordHash: 'scrypt$hash',
      isActive: false,
    });
    jest.spyOn(passwordHashUtil, 'verifyPassword').mockResolvedValueOnce(true);

    await expect(
      service.login({
        email: 'superadmin@academix.com',
        password: 'Academix.SuperAdmin.2026',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when super admin does not exist', async () => {
    superAdminFindUnique.mockResolvedValue(null);
    jest.spyOn(passwordHashUtil, 'verifyPassword').mockResolvedValueOnce(false);

    await expect(
      service.login({
        email: 'missing@academix.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when refresh token is invalid', async () => {
    verifyAsync.mockRejectedValueOnce(new Error('invalid token'));

    await expect(
      service.refresh('invalid-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when refresh token subject mismatch', async () => {
    verifyAsync.mockResolvedValueOnce({
      sub: 'sa-1',
      super_admin_id: 'sa-2',
      email: 'superadmin@academix.com',
      role: 'SUPER_ADMIN',
      token_type: 'refresh',
    });

    await expect(
      service.refresh('mismatched-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns super admin profile when active', async () => {
    superAdminFindUnique.mockResolvedValue({
      id: 'sa-1',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@academix.com',
      phone: '+212600000001',
      isActive: true,
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
    });

    const profile = await service.getProfile('sa-1');

    expect(profile.id).toBe('sa-1');
    expect(profile.email).toBe('superadmin@academix.com');
  });

  it('throws UnauthorizedException when profile account is inactive', async () => {
    superAdminFindUnique.mockResolvedValue({
      id: 'sa-1',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@academix.com',
      phone: '+212600000001',
      isActive: false,
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
    });

    await expect(service.getProfile('sa-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
