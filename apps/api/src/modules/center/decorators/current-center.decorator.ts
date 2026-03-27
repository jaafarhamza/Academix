import {
  UnauthorizedException,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { AuthenticatedCenterAdmin } from '../types/authenticated-center-admin.type';

type RequestWithCenter = {
  user?: AuthenticatedCenterAdmin;
};

export const extractCurrentCenter = (
  context: ExecutionContext,
): AuthenticatedCenterAdmin => {
  const request = context.switchToHttp().getRequest<RequestWithCenter>();
  if (!request.user) {
    throw new UnauthorizedException('Unauthorized');
  }

  return request.user;
};

export const CurrentCenter = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedCenterAdmin =>
    extractCurrentCenter(context),
);
