import {
  Injectable,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { USER_JWT_STRATEGY } from '../../modules/auth/constants/user-auth.constants';
import { CENTER_JWT_STRATEGY } from '../../modules/center/constants/center-auth.constants';
import { SUPER_ADMIN_JWT_STRATEGY } from '../../modules/super-admin/constants/super-admin-auth.constants';
import { IS_PUBLIC_KEY } from '../constants/public-route.constants';

@Injectable()
export class AppJwtAuthGuard extends AuthGuard([
  USER_JWT_STRATEGY,
  CENTER_JWT_STRATEGY,
  SUPER_ADMIN_JWT_STRATEGY,
]) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  override handleRequest<TUser>(
    err: unknown,
    user: TUser | false | null,
  ): TUser {
    if (err || !user) {
      if (err instanceof Error) {
        throw err;
      }
      throw new UnauthorizedException('Unauthorized');
    }

    return user;
  }
}
