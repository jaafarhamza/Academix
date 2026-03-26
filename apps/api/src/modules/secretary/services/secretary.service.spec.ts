import { ConflictException, NotFoundException } from '@nestjs/common';
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
  type UserFindManyArgs = {
    where: Record<string, unknown>;
    orderBy: Array<Record<string, 'asc' | 'desc'>>;
    skip: number;
    take: number;
    select: Record<string, boolean>;
  };
  const userFindMany = jest.fn<
    Promise<CreatedSecretary[]>,
    [UserFindManyArgs]
  >();
  type SecretaryDetail = CreatedSecretary & {
    updatedAt: Date;
  };
  type SecretaryState = {
    id: string;
    isActive: boolean;
  };
  type UserFindFirstArgs = {
    where: Record<string, unknown>;
    select: Record<string, unknown>;
  };
  const userFindFirst = jest.fn<
    Promise<SecretaryDetail | SecretaryState | null>,
    [UserFindFirstArgs]
  >();
  type UserUpdateArgs = {
    where: {
      id: string;
    };
    data: Record<string, unknown>;
    select?: Record<string, unknown>;
  };
  const userUpdate = jest.fn<Promise<SecretaryDetail>, [UserUpdateArgs]>();
  const prismaService = {
    user: {
      create: userCreate,
      findMany: userFindMany,
      findFirst: userFindFirst,
      update: userUpdate,
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

  it('lists secretaries for current center with default pagination', async () => {
    userFindMany.mockResolvedValueOnce([
      {
        id: 'secretary-1',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        firstName: 'Sara',
        lastName: 'Secretary',
        email: 'sara@academix-demo.com',
        phone: '+212600000012',
        role: UserRole.SECRETARY,
        cin: 'CIN-SEC-001',
        isActive: true,
        createdAt: new Date('2026-03-27T12:00:00.000Z'),
      },
    ]);

    const result = await service.findAll(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.center_id).toBe('2cc4267d-f618-478f-aa2f-9699ecbe332f');

    const args = userFindMany.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    if (!args) {
      throw new Error('Expected user.findMany to be called');
    }

    expect(args.skip).toBe(0);
    expect(args.take).toBe(20);
    expect(args.where).toEqual(
      expect.objectContaining({
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        role: UserRole.SECRETARY,
      }),
    );
  });

  it('applies filters and pagination when listing secretaries', async () => {
    userFindMany.mockResolvedValueOnce([]);

    await service.findAll('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
      search: 'sara',
      isActive: true,
      page: 2,
      limit: 5,
    });

    const args = userFindMany.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    if (!args) {
      throw new Error('Expected user.findMany to be called');
    }

    expect(args.skip).toBe(5);
    expect(args.take).toBe(5);
    expect(args.where).toEqual(
      expect.objectContaining({
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        role: UserRole.SECRETARY,
        isActive: true,
      }),
    );
    const whereWithOr = args.where as {
      OR?: Array<{
        firstName?: {
          contains: string;
          mode: string;
        };
      }>;
    };

    const firstOrClause = whereWithOr.OR?.[0];
    expect(firstOrClause).toBeDefined();
    if (!firstOrClause?.firstName) {
      throw new Error('Expected firstName search clause');
    }

    expect(firstOrClause.firstName.contains).toBe('sara');
    expect(firstOrClause.firstName.mode).toBe('insensitive');
  });

  it('returns secretary details for current center', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'secretary-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Sara',
      lastName: 'Secretary',
      email: 'sara@academix-demo.com',
      phone: '+212600000012',
      role: UserRole.SECRETARY,
      cin: 'CIN-SEC-001',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
    });

    const result = await service.findOne(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'secretary-1',
    );

    expect(result).toMatchObject({
      id: 'secretary-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'sara@academix-demo.com',
    });

    const args = userFindFirst.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    if (!args) {
      throw new Error('Expected user.findFirst to be called');
    }

    expect(args.where).toEqual({
      id: 'secretary-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      role: UserRole.SECRETARY,
    });
  });

  it('updates secretary details for current center', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'secretary-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Sara',
      lastName: 'Secretary',
      email: 'sara@academix-demo.com',
      phone: '+212600000012',
      role: UserRole.SECRETARY,
      cin: 'CIN-SEC-001',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
    });
    userUpdate.mockResolvedValueOnce({
      id: 'secretary-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Updated Sara',
      lastName: 'Secretary',
      email: 'updated.sara@academix-demo.com',
      phone: '+212600000015',
      role: UserRole.SECRETARY,
      cin: 'CIN-SEC-001',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-20T09:00:00.000Z'),
    });

    const result = await service.update(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'secretary-1',
      {
        firstName: 'Updated Sara',
        email: 'updated.sara@academix-demo.com',
        phone: '+212600000015',
      },
    );

    expect(result).toMatchObject({
      id: 'secretary-1',
      firstName: 'Updated Sara',
      email: 'updated.sara@academix-demo.com',
    });

    const args = userUpdate.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    if (!args) {
      throw new Error('Expected user.update to be called');
    }

    expect(args.where).toEqual({ id: 'secretary-1' });
    expect(args.data).toEqual({
      firstName: 'Updated Sara',
      email: 'updated.sara@academix-demo.com',
      phone: '+212600000015',
    });
  });

  it('returns existing secretary details when update payload is empty', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'secretary-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Sara',
      lastName: 'Secretary',
      email: 'sara@academix-demo.com',
      phone: '+212600000012',
      role: UserRole.SECRETARY,
      cin: 'CIN-SEC-001',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
    });

    const result = await service.update(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'secretary-1',
      {},
    );

    expect(result).toMatchObject({
      id: 'secretary-1',
      firstName: 'Sara',
      email: 'sara@academix-demo.com',
    });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when updating secretary outside current center', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.update('2cc4267d-f618-478f-aa2f-9699ecbe332f', 'secretary-404', {
        firstName: 'Updated',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('throws ConflictException when updating secretary with duplicate email', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'secretary-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Sara',
      lastName: 'Secretary',
      email: 'sara@academix-demo.com',
      phone: '+212600000012',
      role: UserRole.SECRETARY,
      cin: 'CIN-SEC-001',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
    });
    userUpdate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['centerId', 'email'] },
    });

    await expect(
      service.update('2cc4267d-f618-478f-aa2f-9699ecbe332f', 'secretary-1', {
        email: 'existing@academix-demo.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deactivates active secretary in current center', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'secretary-1',
      isActive: true,
    });
    userUpdate.mockResolvedValueOnce({
      id: 'secretary-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Sara',
      lastName: 'Secretary',
      email: 'sara@academix-demo.com',
      phone: '+212600000012',
      role: UserRole.SECRETARY,
      cin: 'CIN-SEC-001',
      isActive: false,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-21T09:00:00.000Z'),
    });

    await service.deactivate(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'secretary-1',
    );

    const findFirstArgs = userFindFirst.mock.calls[0]?.[0];
    expect(findFirstArgs).toBeDefined();
    if (!findFirstArgs) {
      throw new Error('Expected user.findFirst to be called');
    }

    expect(findFirstArgs.where).toEqual({
      id: 'secretary-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      role: UserRole.SECRETARY,
    });

    const updateArgs = userUpdate.mock.calls[0]?.[0];
    expect(updateArgs).toBeDefined();
    if (!updateArgs) {
      throw new Error('Expected user.update to be called');
    }

    expect(updateArgs.where).toEqual({ id: 'secretary-1' });
    expect(updateArgs.data).toEqual({ isActive: false });
  });

  it('does not update secretary when already inactive', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'secretary-1',
      isActive: false,
    });

    await service.deactivate(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'secretary-1',
    );

    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when deactivating secretary outside current center', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.deactivate(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        'secretary-404',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when secretary details do not exist in current center', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.findOne('2cc4267d-f618-478f-aa2f-9699ecbe332f', 'secretary-404'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns secretary module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'secretary',
      status: 'ready',
    });
  });
});
