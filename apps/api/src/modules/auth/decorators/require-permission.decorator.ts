import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import type { PermissionAction } from '../../../generated/prisma/enums';
import { USER_PERMISSION_KEY } from '../constants/user-auth.constants';
import { PermissionsGuard } from '../guards/permissions.guard';
import { UserJwtAuthGuard } from '../guards/user-jwt-auth.guard';

export function RequirePermission(
  permission: PermissionAction,
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(USER_PERMISSION_KEY, permission),
    UseGuards(UserJwtAuthGuard, PermissionsGuard),
  );
}
