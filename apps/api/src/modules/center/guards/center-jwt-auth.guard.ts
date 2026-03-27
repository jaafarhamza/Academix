import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CENTER_JWT_STRATEGY } from '../constants/center-auth.constants';

@Injectable()
export class CenterJwtAuthGuard extends AuthGuard(CENTER_JWT_STRATEGY) {
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
