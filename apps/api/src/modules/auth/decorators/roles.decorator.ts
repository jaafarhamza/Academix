import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../../generated/prisma/enums';
import { USER_ROLES_KEY } from '../constants/user-auth.constants';

export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(USER_ROLES_KEY, roles);
