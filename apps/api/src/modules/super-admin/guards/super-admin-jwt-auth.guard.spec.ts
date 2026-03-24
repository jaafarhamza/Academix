import { UnauthorizedException } from '@nestjs/common';
import { SuperAdminJwtAuthGuard } from './super-admin-jwt-auth.guard';

describe('SuperAdminJwtAuthGuard', () => {
  let guard: SuperAdminJwtAuthGuard;

  beforeEach(() => {
    guard = new SuperAdminJwtAuthGuard();
  });

  it('returns super admin user when authentication succeeds', () => {
    const user = {
      id: 'sa-1',
      email: 'superadmin@academix.com',
      role: 'SUPER_ADMIN',
    };

    const result = guard.handleRequest(null, user);

    expect(result).toEqual(user);
  });

  it('throws existing error when passport returns an Error', () => {
    const error = new UnauthorizedException('Invalid token');

    expect(() => guard.handleRequest(error, null)).toThrow(error);
  });

  it('throws UnauthorizedException when super admin user is missing', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(
      UnauthorizedException,
    );
  });
});
