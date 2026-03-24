import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const getAllAndOverride = jest.fn();
  const reflector = {
    getAllAndOverride,
  };

  let guard: RolesGuard;

  const createContext = (user?: {
    id: string;
    center_id: string;
    email: string;
    role: 'ADMIN' | 'SECRETARY' | 'TEACHER' | 'STUDENT';
  }): ExecutionContext =>
    ({
      getHandler: () => 'handler',
      getClass: () => class TestClass {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('returns true when route has no roles metadata', () => {
    getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(createContext());

    expect(result).toBe(true);
  });

  it('returns true when user role is included in required roles', () => {
    getAllAndOverride.mockReturnValue(['ADMIN', 'SECRETARY']);

    const result = guard.canActivate(
      createContext({
        id: 'user-1',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        email: 'admin@academix-demo.com',
        role: 'SECRETARY',
      }),
    );

    expect(result).toBe(true);
  });

  it('throws UnauthorizedException when user is missing', () => {
    getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('throws ForbiddenException when user role is not allowed', () => {
    getAllAndOverride.mockReturnValue(['ADMIN', 'SECRETARY']);

    expect(() =>
      guard.canActivate(
        createContext({
          id: 'user-1',
          center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
          email: 'teacher@academix-demo.com',
          role: 'TEACHER',
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
