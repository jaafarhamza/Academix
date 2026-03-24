import {
  UnauthorizedException,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

type RequestWithUser = {
  user?: AuthenticatedUser;
};

export const extractCurrentUser = (
  context: ExecutionContext,
): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest<RequestWithUser>();
  if (!request.user) {
    throw new UnauthorizedException('Unauthorized');
  }
  return request.user;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    extractCurrentUser(context),
);
