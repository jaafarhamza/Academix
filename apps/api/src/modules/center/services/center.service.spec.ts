import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import * as passwordHashUtil from '../../../common/utils/password-hash.util';
import type { RegisterCenterResponseDto } from '../dto/register-center-response.dto';
import { CenterService } from './center.service';

describe('CenterService', () => {
  type CenterFindUniqueArgs = {
    where: { email?: string; subdomain?: string };
    select: { id: true };
  };

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

  const centerFindUnique = jest.fn<
    Promise<{ id: string } | null>,
    [CenterFindUniqueArgs]
  >();
  const centerCreate = jest.fn<
    Promise<RegisterCenterResponseDto>,
    [CenterCreateArgs]
  >();
  const prismaService = {
    center: {
      findUnique: centerFindUnique,
      create: centerCreate,
    },
  };

  let service: CenterService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CenterService(prismaService as unknown as PrismaService);
  });

  it('creates center, hashes password, and generates base subdomain', async () => {
    centerFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    centerCreate.mockResolvedValue({
      id: 'center-1',
      superAdminId: 'sa-1',
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

    const result = await service.register(
      {
        firstName: 'Center',
        lastName: 'Owner',
        centerName: 'Academix Demo Center',
        email: 'admin@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000010',
      },
      'sa-1',
    );

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

  it('creates next available subdomain suffix when base is already used', async () => {
    centerFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing-1' })
      .mockResolvedValueOnce(null);
    centerCreate.mockResolvedValue({
      id: 'center-2',
      superAdminId: 'sa-1',
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

    const result = await service.register(
      {
        firstName: 'Center',
        lastName: 'Owner',
        centerName: 'Academix Demo Center',
        email: 'admin2@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000010',
      },
      'sa-1',
    );

    expect(result.subdomain).toBe('academix-demo-center-2');
  });

  it('throws ConflictException when center email already exists', async () => {
    centerFindUnique.mockResolvedValueOnce({ id: 'existing-email' });

    await expect(
      service.register(
        {
          firstName: 'Center',
          lastName: 'Owner',
          centerName: 'Academix Demo Center',
          email: 'admin@academix-demo.com',
          password: 'StrongPass1!',
          phone: '+212600000010',
        },
        'sa-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(centerCreate).not.toHaveBeenCalled();
  });
});
