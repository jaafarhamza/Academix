import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { RolePermissionService } from './role-permission.service';

describe('RolePermissionService', () => {
  const create = jest.fn();
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();

  const prismaService = {
    rolePermission: {
      create,
      findMany,
      findFirst,
      update,
      delete: remove,
    },
  };

  let service: RolePermissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RolePermissionService(
      prismaService as unknown as PrismaService,
    );
  });

  it('creates role permission for center', async () => {
    create.mockResolvedValue({
      id: 'rp-1',
      centerId: 'center-1',
      role: 'SECRETARY',
      permission: 'MANAGE_USERS',
      isGranted: true,
    });

    const result = await service.create('center-1', {
      role: 'SECRETARY',
      permission: 'MANAGE_USERS',
      isGranted: true,
    });

    expect(result).toEqual({
      id: 'rp-1',
      center_id: 'center-1',
      role: 'SECRETARY',
      permission: 'MANAGE_USERS',
      isGranted: true,
    });
  });

  it('throws ConflictException on duplicate create', async () => {
    create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create('center-1', {
        role: 'SECRETARY',
        permission: 'MANAGE_USERS',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns center-scoped list with filters', async () => {
    findMany.mockResolvedValue([
      {
        id: 'rp-1',
        centerId: 'center-1',
        role: 'ADMIN',
        permission: 'MANAGE_USERS',
        isGranted: true,
      },
    ]);

    const result = await service.findAll('center-1', {
      role: 'ADMIN',
    });

    expect(result).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          centerId: 'center-1',
          role: 'ADMIN',
        },
      }),
    );
  });

  it('throws NotFoundException when role permission does not exist', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('center-1', 'rp-unknown'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates isGranted for existing role permission', async () => {
    findFirst.mockResolvedValue({
      id: 'rp-1',
      centerId: 'center-1',
      role: 'SECRETARY',
      permission: 'MANAGE_USERS',
      isGranted: false,
    });
    update.mockResolvedValue({
      id: 'rp-1',
      centerId: 'center-1',
      role: 'SECRETARY',
      permission: 'MANAGE_USERS',
      isGranted: true,
    });

    const result = await service.update('center-1', 'rp-1', {
      isGranted: true,
    });

    expect(result.isGranted).toBe(true);
  });

  it('deletes existing role permission', async () => {
    findFirst.mockResolvedValue({ id: 'rp-1' });
    remove.mockResolvedValue({ id: 'rp-1' });

    await service.remove('center-1', 'rp-1');

    expect(remove).toHaveBeenCalledWith({
      where: { id: 'rp-1' },
    });
  });
});
