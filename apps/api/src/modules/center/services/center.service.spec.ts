import {
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import * as passwordHashUtil from '../../../common/utils/password-hash.util';
import type { RegisterCenterResponseDto } from '../dto/register-center-response.dto';
import { CenterService } from './center.service';

describe('CenterService', () => {
  type CenterCreateArgs = {
    data: {
      superAdminId: string;
      firstName: string;
      lastName: string;
      centerName: string;
      email: string;
      passwordHash: string;
      phone: string;
      logoUrl: string | null;
      subdomain: string;
    };
    select: Record<string, boolean>;
  };

  const centerFindUnique = jest.fn();
  const superAdminFindUnique = jest.fn();
  const superAdminFindFirst = jest.fn();
  const centerCreate = jest.fn<
    Promise<RegisterCenterResponseDto>,
    [CenterCreateArgs]
  >();
  const prismaService = {
    superAdmin: {
      findUnique: superAdminFindUnique,
      findFirst: superAdminFindFirst,
    },
    center: {
      findUnique: centerFindUnique,
      create: centerCreate,
    },
  };

  const signAsync = jest.fn();
  const jwtService = { signAsync };
  const uploadCenterLogo = jest.fn();
  const centerLogoStorageService = { uploadCenterLogo };

  const getConfig = jest.fn();
  const configService = { get: getConfig };

  let service: CenterService;

  beforeEach(() => {
    jest.clearAllMocks();
    getConfig.mockImplementation((key: string) => {
      const values: Record<string, unknown> = {
        'superAdminBootstrap.email': 'superadmin@academix.com',
        'centerAuth.jwtExpiresIn': '1h',
        'centerAuth.refreshJwtSecret':
          'development-center-refresh-jwt-secret-change-me',
        'centerAuth.refreshJwtExpiresIn': '7d',
      };

      return values[key];
    });
    superAdminFindUnique.mockResolvedValue({ id: 'sa-1', isActive: true });
    superAdminFindFirst.mockResolvedValue(null);
    service = new CenterService(
      prismaService as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      centerLogoStorageService as never,
    );
  });

  it('creates center, hashes password, and uses slugified subdomain', async () => {
    centerCreate.mockResolvedValue({
      id: 'center-1',
      firstName: 'Center',
      lastName: 'Owner',
      centerName: 'Academix Demo Center',
      email: 'admin@academix-demo.com',
      phone: '+212600000010',
      logoUrl: null,
      subdomain: 'academix-demo-center',
      isActive: true,
      createdAt: new Date('2026-03-22T00:00:00.000Z'),
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    const result = await service.register({
      firstName: 'Center',
      lastName: 'Owner',
      centerName: 'Academix Demo Center',
      email: 'admin@academix-demo.com',
      password: 'StrongPass1!',
      phone: '+212600000010',
    });

    expect(result.subdomain).toBe('academix-demo-center');
    const createArgs = centerCreate.mock.calls[0]?.[0];
    expect(createArgs).toBeDefined();
    if (!createArgs) {
      throw new Error('Expected center.create to be called once');
    }

    expect(createArgs.data.passwordHash).toBe('scrypt$hash');
    expect(createArgs.data.subdomain).toBe('academix-demo-center');
    expect(createArgs.data.superAdminId).toBe('sa-1');
  });

  it('retries with suffix when subdomain unique conflict occurs', async () => {
    centerCreate
      .mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: ['subdomain'] },
      })
      .mockResolvedValueOnce({
        id: 'center-2',
        firstName: 'Center',
        lastName: 'Owner',
        centerName: 'Academix Demo Center',
        email: 'admin2@academix-demo.com',
        phone: '+212600000010',
        logoUrl: null,
        subdomain: 'academix-demo-center-2',
        isActive: true,
        createdAt: new Date('2026-03-22T00:00:00.000Z'),
      });

    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    const result = await service.register({
      firstName: 'Center',
      lastName: 'Owner',
      centerName: 'Academix Demo Center',
      email: 'admin2@academix-demo.com',
      password: 'StrongPass1!',
      phone: '+212600000010',
    });

    expect(result.subdomain).toBe('academix-demo-center-2');
    expect(centerCreate).toHaveBeenCalledTimes(2);

    const firstCall = centerCreate.mock.calls[0]?.[0];
    const secondCall = centerCreate.mock.calls[1]?.[0];

    expect(firstCall?.data.subdomain).toBe('academix-demo-center');
    expect(secondCall?.data.subdomain).toBe('academix-demo-center-2');
  });

  it('throws ConflictException when center email already exists', async () => {
    centerCreate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['email'] },
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    await expect(
      service.register({
        firstName: 'Center',
        lastName: 'Owner',
        centerName: 'Academix Demo Center',
        email: 'admin@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000010',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(centerCreate).toHaveBeenCalledTimes(1);
  });

  it('throws generic ConflictException for unknown unique constraint targets', async () => {
    centerCreate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['unknown_unique_field'] },
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    await expect(
      service.register({
        firstName: 'Center',
        lastName: 'Owner',
        centerName: 'Academix Demo Center',
        email: 'admin@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000010',
      }),
    ).rejects.toThrow('Center already exists with the provided unique fields');
  });

  it('throws ConflictException when no unique subdomain can be generated', async () => {
    centerCreate.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['subdomain'] },
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    await expect(
      service.register({
        firstName: 'Center',
        lastName: 'Owner',
        centerName: 'Academix Demo Center',
        email: 'admin@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000010',
      }),
    ).rejects.toThrow(
      'Unable to generate a unique center subdomain. Please try another center name.',
    );
    expect(centerCreate).toHaveBeenCalledTimes(50);
  });

  it('rethrows non-unique registration errors', async () => {
    centerCreate.mockRejectedValueOnce(new Error('database unavailable'));
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    await expect(
      service.register({
        firstName: 'Center',
        lastName: 'Owner',
        centerName: 'Academix Demo Center',
        email: 'admin@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000010',
      }),
    ).rejects.toThrow('database unavailable');
  });

  it('falls back to first active super admin when configured one is missing', async () => {
    superAdminFindUnique.mockResolvedValueOnce(null);
    superAdminFindFirst.mockResolvedValueOnce({ id: 'sa-2' });
    centerCreate.mockResolvedValueOnce({
      id: 'center-2',
      firstName: 'Center',
      lastName: 'Owner',
      centerName: 'Fallback Center',
      email: 'owner@fallback-center.com',
      phone: '+212600000011',
      logoUrl: null,
      subdomain: 'fallback-center',
      isActive: true,
      createdAt: new Date('2026-03-25T00:00:00.000Z'),
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    await service.register({
      firstName: 'Center',
      lastName: 'Owner',
      centerName: 'Fallback Center',
      email: 'owner@fallback-center.com',
      password: 'StrongPass1!',
      phone: '+212600000011',
    });

    const createArgs = centerCreate.mock.calls[0]?.[0];
    expect(createArgs?.data.superAdminId).toBe('sa-2');
  });

  it('throws ServiceUnavailableException when no active super admin exists', async () => {
    superAdminFindUnique.mockResolvedValueOnce(null);
    superAdminFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.register({
        firstName: 'Center',
        lastName: 'Owner',
        centerName: 'No Admin Center',
        email: 'owner@no-admin-center.com',
        password: 'StrongPass1!',
        phone: '+212600000012',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns center access token for valid login credentials', async () => {
    centerFindUnique.mockResolvedValue({
      id: 'center-1',
      centerName: 'Academix Demo Center',
      email: 'admin@academix-demo.com',
      passwordHash: 'scrypt$hash',
      subdomain: 'academix-demo',
      isActive: true,
    });
    jest.spyOn(passwordHashUtil, 'verifyPassword').mockResolvedValueOnce(true);
    signAsync
      .mockResolvedValueOnce('center-token-123')
      .mockResolvedValueOnce('center-refresh-token-123');

    const result = await service.login({
      email: 'ADMIN@ACADEMIX-DEMO.COM',
      password: 'Academix.CenterAdmin.2026',
    });

    expect(result.accessToken).toBe('center-token-123');
    expect(result.refreshToken).toBe('center-refresh-token-123');
    expect(result.center.email).toBe('admin@academix-demo.com');
    expect(signAsync).toHaveBeenNthCalledWith(1, {
      sub: 'center-1',
      center_id: 'center-1',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      subdomain: 'academix-demo',
      token_type: 'access',
    });
    expect(signAsync).toHaveBeenNthCalledWith(
      2,
      {
        sub: 'center-1',
        center_id: 'center-1',
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
        subdomain: 'academix-demo',
        token_type: 'refresh',
      },
      {
        secret: 'development-center-refresh-jwt-secret-change-me',
        expiresIn: '7d',
        issuer: 'academix-api',
        audience: 'center-admin-refresh',
      },
    );
  });

  it('throws UnauthorizedException on invalid center login credentials', async () => {
    centerFindUnique.mockResolvedValue({
      id: 'center-1',
      centerName: 'Academix Demo Center',
      email: 'admin@academix-demo.com',
      passwordHash: 'scrypt$hash',
      subdomain: 'academix-demo',
      isActive: true,
    });
    jest.spyOn(passwordHashUtil, 'verifyPassword').mockResolvedValueOnce(false);

    await expect(
      service.login({
        email: 'admin@academix-demo.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when center account is inactive', async () => {
    centerFindUnique.mockResolvedValue({
      id: 'center-1',
      centerName: 'Academix Demo Center',
      email: 'admin@academix-demo.com',
      passwordHash: 'scrypt$hash',
      subdomain: 'academix-demo',
      isActive: false,
    });
    jest.spyOn(passwordHashUtil, 'verifyPassword').mockResolvedValueOnce(true);

    await expect(
      service.login({
        email: 'admin@academix-demo.com',
        password: 'Academix.CenterAdmin.2026',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException when center account does not exist', async () => {
    centerFindUnique.mockResolvedValue(null);
    jest.spyOn(passwordHashUtil, 'verifyPassword').mockResolvedValueOnce(false);

    await expect(
      service.login({
        email: 'missing@academix-demo.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
