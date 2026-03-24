import type { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { sign } from 'jsonwebtoken';
import {
  USER_AUTH_AUDIENCE,
  USER_AUTH_ISSUER,
  USER_REFRESH_AUDIENCE,
} from '../../modules/auth/constants/user-auth.constants';
import {
  CENTER_AUDIENCE,
  CENTER_ISSUER,
} from '../../modules/center/constants/center-auth.constants';
import {
  SUPER_ADMIN_AUDIENCE,
  SUPER_ADMIN_ISSUER,
} from '../../modules/super-admin/constants/super-admin-auth.constants';
import type { RequestWithTenant } from '../types/request-with-tenant.type';
import { TenantMiddleware } from './tenant.middleware';

const USER_SECRET = 'development-user-jwt-secret-change-me';
const CENTER_SECRET = 'development-center-jwt-secret-change-me';
const SUPER_ADMIN_SECRET = 'development-super-admin-jwt-secret-change-me';
const CENTER_ID = '2cc4267d-f618-478f-aa2f-9699ecbe332f';

describe('TenantMiddleware', () => {
  const getConfig = jest.fn();
  const configService = {
    get: getConfig,
  };

  let middleware: TenantMiddleware;

  const createRequest = (authorization?: string): RequestWithTenant =>
    ({
      headers: authorization ? { authorization } : {},
    }) as RequestWithTenant;

  beforeEach(() => {
    jest.clearAllMocks();
    getConfig.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        'userAuth.jwtSecret': USER_SECRET,
        'centerAuth.jwtSecret': CENTER_SECRET,
        'superAdminAuth.jwtSecret': SUPER_ADMIN_SECRET,
      };
      return config[key];
    });

    middleware = new TenantMiddleware(
      configService as unknown as ConfigService,
    );
  });

  it('does not set tenant context when authorization header is missing', () => {
    const request = createRequest();
    const next = jest.fn();

    middleware.use(
      request as unknown as Request,
      {} as Response,
      next as unknown as NextFunction,
    );

    expect(request.center_id).toBeUndefined();
    expect(request.tenant).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('sets tenant context for valid user access token', () => {
    const token = sign(
      {
        sub: 'user-1',
        user_id: 'user-1',
        center_id: CENTER_ID,
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
        token_type: 'access',
      },
      USER_SECRET,
      {
        algorithm: 'HS256',
        issuer: USER_AUTH_ISSUER,
        audience: USER_AUTH_AUDIENCE,
      },
    );
    const request = createRequest(`Bearer ${token}`);
    const next = jest.fn();

    middleware.use(
      request as unknown as Request,
      {} as Response,
      next as unknown as NextFunction,
    );

    expect(request.center_id).toBe(CENTER_ID);
    expect(request.tenant).toEqual({ center_id: CENTER_ID });
  });

  it('does not set tenant context for user refresh token', () => {
    const token = sign(
      {
        sub: 'user-1',
        user_id: 'user-1',
        center_id: CENTER_ID,
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
        token_type: 'refresh',
      },
      USER_SECRET,
      {
        algorithm: 'HS256',
        issuer: USER_AUTH_ISSUER,
        audience: USER_REFRESH_AUDIENCE,
      },
    );
    const request = createRequest(`Bearer ${token}`);
    const next = jest.fn();

    middleware.use(
      request as unknown as Request,
      {} as Response,
      next as unknown as NextFunction,
    );

    expect(request.center_id).toBeUndefined();
    expect(request.tenant).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('sets tenant context for valid center-admin token', () => {
    const token = sign(
      {
        sub: CENTER_ID,
        center_id: CENTER_ID,
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
        subdomain: 'academix-demo',
      },
      CENTER_SECRET,
      {
        algorithm: 'HS256',
        issuer: CENTER_ISSUER,
        audience: CENTER_AUDIENCE,
      },
    );
    const request = createRequest(`Bearer ${token}`);
    const next = jest.fn();

    middleware.use(
      request as unknown as Request,
      {} as Response,
      next as unknown as NextFunction,
    );

    expect(request.center_id).toBe(CENTER_ID);
    expect(request.tenant).toEqual({ center_id: CENTER_ID });
  });

  it('does not set tenant context for super-admin token', () => {
    const token = sign(
      {
        sub: 'super-admin-1',
        email: 'superadmin@academix.com',
        role: 'SUPER_ADMIN',
      },
      SUPER_ADMIN_SECRET,
      {
        algorithm: 'HS256',
        issuer: SUPER_ADMIN_ISSUER,
        audience: SUPER_ADMIN_AUDIENCE,
      },
    );
    const request = createRequest(`Bearer ${token}`);
    const next = jest.fn();

    middleware.use(
      request as unknown as Request,
      {} as Response,
      next as unknown as NextFunction,
    );

    expect(request.center_id).toBeUndefined();
    expect(request.tenant).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('ignores token when signature is invalid', () => {
    const token = sign(
      {
        sub: 'user-1',
        user_id: 'user-1',
        center_id: CENTER_ID,
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
        token_type: 'access',
      },
      'wrong-secret',
      {
        algorithm: 'HS256',
        issuer: USER_AUTH_ISSUER,
        audience: USER_AUTH_AUDIENCE,
      },
    );
    const request = createRequest(`Bearer ${token}`);
    const next = jest.fn();

    middleware.use(
      request as unknown as Request,
      {} as Response,
      next as unknown as NextFunction,
    );

    expect(request.center_id).toBeUndefined();
    expect(request.tenant).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
