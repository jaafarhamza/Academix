import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionAction } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { USER_PERMISSION_KEY } from '../constants/user-auth.constants';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

type RequestWithUser = {
  user?: AuthenticatedUser;
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<
      PermissionAction | undefined
    >(USER_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const permission = await this.prismaService.rolePermission.findUnique({
      where: {
        centerId_role_permission: {
          centerId: user.center_id,
          role: user.role,
          permission: requiredPermission,
        },
      },
      select: {
        isGranted: true,
      },
    });

    if (!permission?.isGranted) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
