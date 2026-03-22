import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { SUPER_ADMIN_ROLE } from '../constants/super-admin-auth.constants';
import { SuperAdminRoleGuard } from './super-admin-role.guard';

describe('SuperAdminRoleGuard', () => {
  const getAllAndOverride = jest.fn();
  const reflector = {
    getAllAndOverride,
  };

  let guard: SuperAdminRoleGuard;

  const createContext = (user?: {
    id: string;
    email: string;
    role: string;
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
    guard = new SuperAdminRoleGuard(reflector as unknown as Reflector);
  });

  it('returns true when route is not marked as super-admin-only', () => {
    getAllAndOverride.mockReturnValue(false);

    const result = guard.canActivate(createContext());

    expect(result).toBe(true);
  });

  it('returns true for authenticated super admin user', () => {
    getAllAndOverride.mockReturnValue(true);

    const result = guard.canActivate(
      createContext({
        id: 'sa-1',
        email: 'superadmin@academix.com',
        role: SUPER_ADMIN_ROLE,
      }),
    );

    expect(result).toBe(true);
  });

  it('throws UnauthorizedException when request user is missing', () => {
    getAllAndOverride.mockReturnValue(true);

    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('throws ForbiddenException when user role is not SUPER_ADMIN', () => {
    getAllAndOverride.mockReturnValue(true);

    expect(() =>
      guard.canActivate(
        createContext({
          id: 'user-1',
          email: 'user@academix.com',
          role: 'ADMIN',
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
