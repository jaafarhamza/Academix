import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SUPER_ADMIN_ONLY_KEY,
  SUPER_ADMIN_ROLE,
} from '../constants/super-admin-auth.constants';
import type { AuthenticatedSuperAdmin } from '../types/authenticated-super-admin.type';

type RequestWithSuperAdmin = {
  user?: AuthenticatedSuperAdmin;
};

@Injectable()
export class SuperAdminRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isSuperAdminOnly = this.reflector.getAllAndOverride<boolean>(
      SUPER_ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isSuperAdminOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithSuperAdmin>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (user.role !== SUPER_ADMIN_ROLE) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
