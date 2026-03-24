import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { AppJwtAuthGuard } from './app-jwt-auth.guard';

describe('AppJwtAuthGuard', () => {
  const getAllAndOverride = jest.fn();
  const reflector = { getAllAndOverride } as unknown as Reflector;

  let guard: AppJwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AppJwtAuthGuard(reflector);
  });

  it('allows public routes without auth token', () => {
    getAllAndOverride.mockReturnValue(true);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(true);
    expect(getAllAndOverride).toHaveBeenCalledTimes(1);
  });

  it('throws UnauthorizedException when user is missing', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(
      UnauthorizedException,
    );
  });

  it('returns authenticated user from passport', () => {
    const user = { sub: 'user-1' };

    expect(guard.handleRequest(null, user)).toBe(user);
  });
});
