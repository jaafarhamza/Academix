import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { SUPER_ADMIN_ROLE } from '../constants/super-admin-auth.constants';
import { SuperAdminJwtStrategy } from './super-admin-jwt.strategy';

describe('SuperAdminJwtStrategy', () => {
  const superAdminFindUnique = jest.fn();
  const prismaService = {
    superAdmin: {
      findUnique: superAdminFindUnique,
    },
  };

  const getConfig = jest.fn();
  const configService = {
    get: getConfig,
  };

  let strategy: SuperAdminJwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    getConfig.mockReturnValue('development-super-admin-jwt-secret-change-me');
    strategy = new SuperAdminJwtStrategy(
      prismaService as unknown as PrismaService,
      configService as unknown as ConfigService,
    );
  });

  it('returns authenticated super admin payload for valid token', async () => {
    superAdminFindUnique.mockResolvedValue({
      id: 'sa-1',
      email: 'superadmin@academix.com',
      isActive: true,
    });

    const result = await strategy.validate({
      sub: 'sa-1',
      email: 'superadmin@academix.com',
      role: SUPER_ADMIN_ROLE,
    });

    expect(result).toEqual({
      id: 'sa-1',
      email: 'superadmin@academix.com',
      role: SUPER_ADMIN_ROLE,
    });
  });

  it('rejects token with non super-admin role', async () => {
    await expect(
      strategy.validate({
        sub: 'sa-1',
        email: 'superadmin@academix.com',
        role: 'SUPER_ADMIN_WRONG' as typeof SUPER_ADMIN_ROLE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects inactive super admin account', async () => {
    superAdminFindUnique.mockResolvedValue({
      id: 'sa-1',
      email: 'superadmin@academix.com',
      isActive: false,
    });

    await expect(
      strategy.validate({
        sub: 'sa-1',
        email: 'superadmin@academix.com',
        role: SUPER_ADMIN_ROLE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects token when payload email mismatches database email', async () => {
    superAdminFindUnique.mockResolvedValue({
      id: 'sa-1',
      email: 'db-superadmin@academix.com',
      isActive: true,
    });

    await expect(
      strategy.validate({
        sub: 'sa-1',
        email: 'token-superadmin@academix.com',
        role: SUPER_ADMIN_ROLE,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
