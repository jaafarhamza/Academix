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
  const jwtService = {
    signAsync,
  };

  const getConfig = jest.fn();
  const configService = {
    get: getConfig,
  };

  let service: SuperAdminService;

  beforeEach(() => {
    jest.clearAllMocks();
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
    signAsync.mockResolvedValueOnce('token-123');
    getConfig.mockReturnValueOnce('1h');

    const result = await service.login({
      email: 'SUPERADMIN@ACADEMIX.COM',
      password: 'Academix.SuperAdmin.2026',
    });

    expect(result.accessToken).toBe('token-123');
    expect(result.superAdmin.email).toBe('superadmin@academix.com');
    expect(signAsync).toHaveBeenCalledWith({
      sub: 'sa-1',
      email: 'superadmin@academix.com',
      role: 'SUPER_ADMIN',
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
});
