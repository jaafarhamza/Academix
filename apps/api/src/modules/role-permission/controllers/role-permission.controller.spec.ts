import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '../../../generated/prisma/enums';
import { USER_ROLES_KEY } from '../../auth/constants/user-auth.constants';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserJwtAuthGuard } from '../../auth/guards/user-jwt-auth.guard';
import { RolePermissionController } from './role-permission.controller';

describe('RolePermissionController RBAC metadata', () => {
  it('uses user JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      RolePermissionController,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;

    expect(guards).toEqual([UserJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN role at class level', () => {
    const roles = Reflect.getMetadata(
      USER_ROLES_KEY,
      RolePermissionController,
    ) as UserRole[] | undefined;

    expect(roles).toEqual([UserRole.ADMIN]);
  });
});
