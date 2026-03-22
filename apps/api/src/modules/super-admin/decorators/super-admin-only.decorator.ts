import { UseGuards, applyDecorators } from '@nestjs/common';
import { SuperAdminJwtAuthGuard } from '../guards/super-admin-jwt-auth.guard';

export function SuperAdminOnly(): MethodDecorator & ClassDecorator {
  return applyDecorators(UseGuards(SuperAdminJwtAuthGuard));
}
