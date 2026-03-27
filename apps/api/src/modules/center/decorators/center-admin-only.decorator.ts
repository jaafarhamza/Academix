import { UseGuards, applyDecorators } from '@nestjs/common';
import { CenterJwtAuthGuard } from '../guards/center-jwt-auth.guard';

export function CenterAdminOnly(): MethodDecorator & ClassDecorator {
  return applyDecorators(UseGuards(CenterJwtAuthGuard));
}
