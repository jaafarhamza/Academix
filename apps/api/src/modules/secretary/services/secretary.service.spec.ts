import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import * as passwordHashUtil from '../../../common/utils/password-hash.util';
import { UserRole } from '../../../generated/prisma/enums';
import { SecretaryService } from './secretary.service';

describe('SecretaryService', () => {
  type UserCreateArgs = {
    data: {
      centerId: string;
      firstName: string;
      lastName: string;
      email: string;
      passwordHash: string;
      phone: string;
      role: UserRole;
      cin: string;
    };
    select: Record<string, boolean>;
  };

  type CreatedSecretary = {
    id: string;
    centerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    cin: string | null;
    isActive: boolean;
    createdAt: Date;
  };

  const userCreate = jest.fn<Promise<CreatedSecretary>, [UserCreateArgs]>();
  const prismaService = {
    user: {
      create: userCreate,
    },
  };

  let service: SecretaryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SecretaryService(prismaService as unknown as PrismaService);
  });

  it('creates secretary with center_id from JWT context and hashes password', async () => {
    userCreate.mockResolvedValueOnce({
      id: 'secretary-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Sara',
      lastName: 'Secretary',
      email: 'secretary.new@academix-demo.com',
      phone: '+212600000013',
      role: UserRole.SECRETARY,
      cin: 'CIN-SEC-002',
      isActive: true,
      createdAt: new Date('2026-03-27T12:00:00.000Z'),
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    const result = await service.create(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        firstName: 'Sara',
        lastName: 'Secretary',
        email: 'secretary.new@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000013',
        cin: 'CIN-SEC-002',
      },
    );

    expect(result).toMatchObject({
      id: 'secretary-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      role: UserRole.SECRETARY,
      cin: 'CIN-SEC-002',
    });

    const createArgs = userCreate.mock.calls[0]?.[0];
    expect(createArgs).toBeDefined();
    if (!createArgs) {
      throw new Error('Expected user.create to be called');
    }

    expect(createArgs.data.centerId).toBe(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
    );
    expect(createArgs.data.passwordHash).toBe('scrypt$hash');
    expect(createArgs.data.role).toBe(UserRole.SECRETARY);
    expect(createArgs.data.cin).toBe('CIN-SEC-002');
  });

  it('throws ConflictException when secretary email already exists for center', async () => {
    userCreate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['centerId', 'email'] },
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        firstName: 'Sara',
        lastName: 'Secretary',
        email: 'secretary.new@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000013',
        cin: 'CIN-SEC-002',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when secretary CIN already exists for center', async () => {
    userCreate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['centerId', 'cin'] },
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        firstName: 'Sara',
        lastName: 'Secretary',
        email: 'secretary.new@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000013',
        cin: 'CIN-SEC-002',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns secretary module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'secretary',
      status: 'ready',
    });
  });
});
