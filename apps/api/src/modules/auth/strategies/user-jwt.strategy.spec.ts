import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { UserJwtStrategy } from './user-jwt.strategy';

describe('UserJwtStrategy', () => {
  const userFindUnique = jest.fn();
  const prismaService = {
    user: {
      findUnique: userFindUnique,
    },
  };

  const getConfig = jest.fn();
  const configService = {
    get: getConfig,
  };

  let strategy: UserJwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    getConfig.mockReturnValue('development-user-jwt-secret-change-me');
    strategy = new UserJwtStrategy(
      prismaService as unknown as PrismaService,
      configService as unknown as ConfigService,
    );
  });

  it('returns authenticated user for valid token payload', async () => {
    userFindUnique.mockResolvedValue({
      id: 'user-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      isActive: true,
    });

    const result = await strategy.validate({
      sub: 'user-1',
      user_id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
    });

    expect(result).toEqual({
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
    });
  });

  it('rejects token when required claims are missing', async () => {
    await expect(
      strategy.validate({
        sub: 'user-1',
        user_id: '',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects token when user account is inactive', async () => {
    userFindUnique.mockResolvedValue({
      id: 'user-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      isActive: false,
    });

    await expect(
      strategy.validate({
        sub: 'user-1',
        user_id: 'user-1',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects token when center_id mismatches database user center', async () => {
    userFindUnique.mockResolvedValue({
      id: 'user-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      isActive: true,
    });

    await expect(
      strategy.validate({
        sub: 'user-1',
        user_id: 'user-1',
        center_id: '9f9b8c0f-5f9d-4ab2-aabf-efd74e0a4aaa',
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects token when role mismatches database role', async () => {
    userFindUnique.mockResolvedValue({
      id: 'user-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      isActive: true,
    });

    await expect(
      strategy.validate({
        sub: 'user-1',
        user_id: 'user-1',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        email: 'admin@academix-demo.com',
        role: 'TEACHER',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
