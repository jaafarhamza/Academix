import { UnauthorizedException } from '@nestjs/common';
import { UserJwtAuthGuard } from './user-jwt-auth.guard';

describe('UserJwtAuthGuard', () => {
  let guard: UserJwtAuthGuard;

  beforeEach(() => {
    guard = new UserJwtAuthGuard();
  });

  it('returns user when authentication succeeds', () => {
    const user = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
    };

    const result = guard.handleRequest(null, user);

    expect(result).toEqual(user);
  });

  it('throws existing error when passport returns an Error', () => {
    const error = new UnauthorizedException('Invalid token');

    expect(() => guard.handleRequest(error, null)).toThrow(error);
  });

  it('throws UnauthorizedException when user is missing', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(
      UnauthorizedException,
    );
  });
});
