import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { SUPER_ADMIN_ONLY_KEY } from '../constants/super-admin-auth.constants';
import { SuperAdminJwtAuthGuard } from '../guards/super-admin-jwt-auth.guard';
import { SuperAdminRoleGuard } from '../guards/super-admin-role.guard';

export function SuperAdminOnly(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(SUPER_ADMIN_ONLY_KEY, true),
    UseGuards(SuperAdminJwtAuthGuard, SuperAdminRoleGuard),
  );
}
