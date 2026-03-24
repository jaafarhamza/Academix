import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { USER_JWT_STRATEGY } from '../constants/user-auth.constants';

@Injectable()
export class UserJwtAuthGuard extends AuthGuard(USER_JWT_STRATEGY) {
  override handleRequest<TUser>(
    err: unknown,
    user: TUser | null | undefined,
  ): TUser {
    if (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new UnauthorizedException('Unauthorized');
    }

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return user;
  }
}
