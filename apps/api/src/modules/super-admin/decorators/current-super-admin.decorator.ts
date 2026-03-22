import {
  UnauthorizedException,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { AuthenticatedSuperAdmin } from '../types/authenticated-super-admin.type';

type RequestWithSuperAdmin = {
  user?: AuthenticatedSuperAdmin;
};

export const CurrentSuperAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedSuperAdmin => {
    const request = context.switchToHttp().getRequest<RequestWithSuperAdmin>();
    if (!request.user) {
      throw new UnauthorizedException('Unauthorized');
    }
    return request.user;
  },
);
