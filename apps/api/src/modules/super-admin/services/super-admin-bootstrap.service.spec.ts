import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import * as passwordHashUtil from '../../../common/utils/password-hash.util';
import { SuperAdminBootstrapService } from './super-admin-bootstrap.service';

describe('SuperAdminBootstrapService', () => {
  const count = jest.fn();
  const create = jest.fn();
  const prismaService = {
    superAdmin: {
      count,
      create,
    },
  };

  const get = jest.fn();
  const configService = {
    get,
  };

  let service: SuperAdminBootstrapService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SuperAdminBootstrapService(
      prismaService as unknown as PrismaService,
      configService as unknown as ConfigService,
    );
  });

  it('creates default super admin on first run when enabled', async () => {
    get.mockImplementation((key: string): unknown => {
      const values: Record<string, unknown> = {
        'superAdminBootstrap.enabled': true,
        'superAdminBootstrap.email': 'SuperAdmin@Academix.com',
        'superAdminBootstrap.password': 'Academix.SuperAdmin.2026',
        'superAdminBootstrap.firstName': 'Super',
        'superAdminBootstrap.lastName': 'Admin',
        'superAdminBootstrap.phone': '+212600000001',
      };
      return values[key];
    });
    count.mockResolvedValueOnce(0);

    jest.spyOn(passwordHashUtil, 'hashPassword').mockResolvedValueOnce('hash');
    create.mockResolvedValueOnce({ id: 'sa-1' });

    await service.onApplicationBootstrap();

    expect(count).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@academix.com',
        phone: '+212600000001',
        passwordHash: 'hash',
        isActive: true,
      },
    });
  });

  it('does nothing when bootstrap seeding is disabled', async () => {
    get.mockReturnValueOnce(false);

    await service.onApplicationBootstrap();

    expect(count).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('does nothing when a super admin already exists', async () => {
    get.mockReturnValueOnce(true);
    count.mockResolvedValueOnce(1);

    await service.onApplicationBootstrap();

    expect(create).not.toHaveBeenCalled();
  });

  it('does not throw on unique constraint race condition', async () => {
    get.mockImplementation((key: string): unknown => {
      const values: Record<string, unknown> = {
        'superAdminBootstrap.enabled': true,
        'superAdminBootstrap.email': 'superadmin@academix.com',
        'superAdminBootstrap.password': 'Academix.SuperAdmin.2026',
        'superAdminBootstrap.firstName': 'Super',
        'superAdminBootstrap.lastName': 'Admin',
        'superAdminBootstrap.phone': '+212600000001',
      };
      return values[key];
    });
    count.mockResolvedValueOnce(0);
    jest.spyOn(passwordHashUtil, 'hashPassword').mockResolvedValueOnce('hash');
    create.mockRejectedValueOnce({ code: 'P2002' });

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
  });

  it('throws when required bootstrap config is missing', async () => {
    get.mockImplementation((key: string): unknown => {
      const values: Record<string, unknown> = {
        'superAdminBootstrap.enabled': true,
        'superAdminBootstrap.email': '',
      };
      return values[key];
    });
    count.mockResolvedValueOnce(0);

    await expect(service.onApplicationBootstrap()).rejects.toThrow(
      'Default super admin email is missing',
    );
  });
});
