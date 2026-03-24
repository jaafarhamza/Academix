import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const getAllAndOverride = jest.fn();
  const reflector = {
    getAllAndOverride,
  };

  const rolePermissionFindUnique = jest.fn();
  const prismaService = {
    rolePermission: {
      findUnique: rolePermissionFindUnique,
    },
  };

  let guard: PermissionsGuard;

  const createContext = (user?: {
    id: string;
    center_id: string;
    email: string;
    role: 'ADMIN' | 'SECRETARY' | 'TEACHER' | 'STUDENT';
  }): ExecutionContext =>
    ({
      getHandler: () => 'handler',
      getClass: () => class TestClass {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      prismaService as unknown as PrismaService,
    );
  });

  it('returns true when route has no permission metadata', async () => {
    getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(rolePermissionFindUnique).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when request user is missing', async () => {
    getAllAndOverride.mockReturnValue('MANAGE_USERS');

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('returns true when permission is granted for user role', async () => {
    getAllAndOverride.mockReturnValue('MANAGE_USERS');
    rolePermissionFindUnique.mockResolvedValue({ isGranted: true });

    await expect(
      guard.canActivate(
        createContext({
          id: 'user-1',
          center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
          email: 'secretary@academix-demo.com',
          role: 'SECRETARY',
        }),
      ),
    ).resolves.toBe(true);

    expect(rolePermissionFindUnique).toHaveBeenCalledWith({
      where: {
        centerId_role_permission: {
          centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
          role: 'SECRETARY',
          permission: 'MANAGE_USERS',
        },
      },
      select: {
        isGranted: true,
      },
    });
  });

  it('throws ForbiddenException when permission is not granted', async () => {
    getAllAndOverride.mockReturnValue('MANAGE_USERS');
    rolePermissionFindUnique.mockResolvedValue({ isGranted: false });

    await expect(
      guard.canActivate(
        createContext({
          id: 'user-1',
          center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
          email: 'teacher@academix-demo.com',
          role: 'TEACHER',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException when permission row does not exist', async () => {
    getAllAndOverride.mockReturnValue('MANAGE_USERS');
    rolePermissionFindUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        createContext({
          id: 'user-1',
          center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
          email: 'teacher@academix-demo.com',
          role: 'TEACHER',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
