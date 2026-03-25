import { HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import type { Request, Response } from 'express';
import { IS_PUBLIC_KEY } from '../../../common/constants/public-route.constants';
import { UserJwtAuthGuard } from '../guards/user-jwt-auth.guard';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const login = jest.fn();
  const refresh = jest.fn();
  const getStatus = jest.fn();
  const authService = {
    login,
    refresh,
    getStatus,
  };
  const getConfig = jest.fn();
  const configService = {
    get: getConfig,
  };

  const configMap: Record<string, unknown> = {
    'userAuth.refreshCookieName': 'academix_refresh_token',
    'userAuth.refreshCookiePath': '/auth/refresh',
    'userAuth.refreshCookieDomain': '',
    'userAuth.refreshCookieSecure': false,
    'userAuth.refreshCookieSameSite': 'lax',
    'userAuth.refreshCookieMaxAgeMs': 604_800_000,
  };

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    getConfig.mockImplementation((key: string) => configMap[key]);
    controller = new AuthController(
      authService as never,
      configService as unknown as ConfigService,
    );
  });

  it('delegates login to auth service', async () => {
    login.mockResolvedValueOnce({
      accessToken: 'access-1',
      tokenType: 'Bearer',
      expiresIn: '1h',
      refreshToken: 'refresh-1',
      refreshExpiresIn: '7d',
      user: {
        id: 'user-1',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        firstName: 'Center',
        lastName: 'Admin',
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
      },
    });

    const payload = {
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      password: 'Academix.AdminUser.2026',
    };
    const cookie = jest.fn();
    const response = {
      cookie,
    } as unknown as Response;

    const result = await controller.login(payload, response);

    expect(result).toEqual({
      accessToken: 'access-1',
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: {
        id: 'user-1',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        firstName: 'Center',
        lastName: 'Admin',
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
      },
    });
    expect(cookie).toHaveBeenCalledWith(
      'academix_refresh_token',
      'refresh-1',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/auth/refresh',
      }),
    );
    expect(login).toHaveBeenCalledWith(payload);
  });

  it('prefers cookie refresh token over request body', async () => {
    refresh.mockResolvedValueOnce({
      accessToken: 'access-2',
      tokenType: 'Bearer',
      expiresIn: '1h',
      refreshToken: 'refresh-2',
      refreshExpiresIn: '7d',
      user: {
        id: 'user-1',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        firstName: 'Center',
        lastName: 'Admin',
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
      },
    });

    const payload = { refreshToken: 'refresh-token' };
    const request = {
      cookies: {
        academix_refresh_token: 'cookie-refresh-token',
      },
    } as unknown as Request;
    const response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;
    const result = await controller.refresh(request, payload, response);

    expect(result.accessToken).toBe('access-2');
    expect(refresh).toHaveBeenCalledWith('cookie-refresh-token');
  });

  it('falls back to refresh token body when cookie is absent', async () => {
    refresh.mockResolvedValueOnce({
      accessToken: 'access-3',
      tokenType: 'Bearer',
      expiresIn: '1h',
      refreshToken: 'refresh-3',
      refreshExpiresIn: '7d',
      user: {
        id: 'user-1',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        firstName: 'Center',
        lastName: 'Admin',
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
      },
    });

    const payload = { refreshToken: 'body-refresh-token' };
    const request = {
      cookies: {},
    } as unknown as Request;
    const response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;

    await controller.refresh(request, payload, response);

    expect(refresh).toHaveBeenCalledWith('body-refresh-token');
  });

  it('delegates status check to auth service', () => {
    getStatus.mockReturnValueOnce({ module: 'auth', status: 'ready' });

    const result = controller.getStatus();

    expect(result).toEqual({ module: 'auth', status: 'ready' });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('marks login endpoint as public and returns HTTP 200', () => {
    const loginDescriptor = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'login',
    );

    if (!loginDescriptor?.value) {
      throw new Error('Expected login descriptor to be defined');
    }

    const loginMethod = loginDescriptor.value as object;
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, loginMethod) as
      | boolean
      | undefined;
    const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA, loginMethod) as
      | number
      | undefined;
    const method = Reflect.getMetadata(METHOD_METADATA, loginMethod) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, loginMethod) as
      | string
      | undefined;

    expect(isPublic).toBe(true);
    expect(httpCode).toBe(HttpStatus.OK);
    expect(method).toBe(RequestMethod.POST);
    expect(path).toBe('login');
  });

  it('marks refresh endpoint as public and returns HTTP 200', () => {
    const refreshDescriptor = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'refresh',
    );

    if (!refreshDescriptor?.value) {
      throw new Error('Expected refresh descriptor to be defined');
    }

    const refreshMethod = refreshDescriptor.value as object;
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, refreshMethod) as
      | boolean
      | undefined;
    const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA, refreshMethod) as
      | number
      | undefined;
    const method = Reflect.getMetadata(METHOD_METADATA, refreshMethod) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, refreshMethod) as
      | string
      | undefined;

    expect(isPublic).toBe(true);
    expect(httpCode).toBe(HttpStatus.OK);
    expect(method).toBe(RequestMethod.POST);
    expect(path).toBe('refresh');
  });

  it('protects status endpoint with UserJwtAuthGuard', () => {
    const statusDescriptor = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'getStatus',
    );

    if (!statusDescriptor?.value) {
      throw new Error('Expected status descriptor to be defined');
    }

    const statusMethod = statusDescriptor.value as object;
    const guards = Reflect.getMetadata(GUARDS_METADATA, statusMethod) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;
    const method = Reflect.getMetadata(METHOD_METADATA, statusMethod) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, statusMethod) as
      | string
      | undefined;

    expect(guards).toEqual([UserJwtAuthGuard]);
    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe('status');
  });
});
