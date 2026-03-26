import { HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import type { Request, Response } from 'express';
import { IS_PUBLIC_KEY } from '../../../common/constants/public-route.constants';
import { SUPER_ADMIN_ONLY_KEY } from '../constants/super-admin-auth.constants';
import { SuperAdminController } from './super-admin.controller';

describe('SuperAdminController', () => {
  const login = jest.fn();
  const refresh = jest.fn();
  const getProfile = jest.fn();
  const superAdminService = {
    login,
    refresh,
    getProfile,
  };
  const getConfig = jest.fn();
  const configService = {
    get: getConfig,
  };
  const configMap: Record<string, unknown> = {
    'superAdminAuth.refreshCookieName': 'academix_super_admin_refresh_token',
    'superAdminAuth.refreshCookiePath': '/super-admin/refresh',
    'superAdminAuth.refreshCookieDomain': '',
    'superAdminAuth.refreshCookieSecure': false,
    'superAdminAuth.refreshCookieSameSite': 'lax',
    'superAdminAuth.refreshCookieMaxAgeMs': 604_800_000,
  };

  let controller: SuperAdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    getConfig.mockImplementation((key: string) => configMap[key]);
    controller = new SuperAdminController(
      superAdminService as never,
      configService as unknown as ConfigService,
    );
  });

  it('delegates login to service and sets refresh cookie', async () => {
    login.mockResolvedValueOnce({
      accessToken: 'token-1',
      tokenType: 'Bearer',
      expiresIn: '1h',
      refreshToken: 'refresh-1',
      refreshExpiresIn: '7d',
      superAdmin: {
        id: 'sa-1',
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@academix.com',
      },
    });

    const payload = {
      email: 'superadmin@academix.com',
      password: 'Academix.SuperAdmin.2026',
    };
    const response = {
      cookie: jest.fn(),
    } as unknown as Response;

    const result = await controller.login(payload, response);

    expect(result).toEqual({
      accessToken: 'token-1',
      tokenType: 'Bearer',
      expiresIn: '1h',
      superAdmin: {
        id: 'sa-1',
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@academix.com',
      },
    });
    expect(login).toHaveBeenCalledWith(payload);
    expect(response.cookie).toHaveBeenCalledWith(
      'academix_super_admin_refresh_token',
      'refresh-1',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/super-admin/refresh',
      }),
    );
  });

  it('prefers cookie refresh token over request body token', async () => {
    refresh.mockResolvedValueOnce({
      accessToken: 'token-2',
      tokenType: 'Bearer',
      expiresIn: '1h',
      refreshToken: 'refresh-2',
      refreshExpiresIn: '7d',
      superAdmin: {
        id: 'sa-1',
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@academix.com',
      },
    });

    const request = {
      cookies: {
        academix_super_admin_refresh_token: 'cookie-refresh-token',
      },
    } as unknown as Request;
    const response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;

    const result = await controller.refresh(
      request,
      { refreshToken: 'body-refresh-token' },
      response,
    );

    expect(result.accessToken).toBe('token-2');
    expect(refresh).toHaveBeenCalledWith('cookie-refresh-token');
    expect(response.cookie).toHaveBeenCalled();
  });

  it('clears refresh cookie on logout', () => {
    const response = {
      clearCookie: jest.fn(),
    } as unknown as Response;

    controller.logout(response);

    expect(response.clearCookie).toHaveBeenCalledWith(
      'academix_super_admin_refresh_token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/super-admin/refresh',
      }),
    );
  });

  it('delegates getProfile to service using authenticated super admin id', async () => {
    getProfile.mockResolvedValueOnce({ id: 'sa-1' });

    const result = await controller.getProfile({
      id: 'sa-1',
      email: 'superadmin@academix.com',
      role: 'SUPER_ADMIN',
    });

    expect(result).toEqual({ id: 'sa-1' });
    expect(getProfile).toHaveBeenCalledWith('sa-1');
  });

  it('marks login endpoint as public and returns HTTP 200', () => {
    const loginDescriptor = Object.getOwnPropertyDescriptor(
      SuperAdminController.prototype,
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
      SuperAdminController.prototype,
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

  it('marks logout endpoint as public and returns HTTP 204', () => {
    const logoutDescriptor = Object.getOwnPropertyDescriptor(
      SuperAdminController.prototype,
      'logout',
    );

    if (!logoutDescriptor?.value) {
      throw new Error('Expected logout descriptor to be defined');
    }

    const logoutMethod = logoutDescriptor.value as object;
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, logoutMethod) as
      | boolean
      | undefined;
    const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA, logoutMethod) as
      | number
      | undefined;
    const method = Reflect.getMetadata(METHOD_METADATA, logoutMethod) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, logoutMethod) as
      | string
      | undefined;

    expect(isPublic).toBe(true);
    expect(httpCode).toBe(HttpStatus.NO_CONTENT);
    expect(method).toBe(RequestMethod.POST);
    expect(path).toBe('logout');
  });

  it('marks profile endpoint as super-admin-only route', () => {
    const profileDescriptor = Object.getOwnPropertyDescriptor(
      SuperAdminController.prototype,
      'getProfile',
    );

    if (!profileDescriptor?.value) {
      throw new Error('Expected profile descriptor to be defined');
    }

    const profileMethod = profileDescriptor.value as object;
    const isSuperAdminOnly = Reflect.getMetadata(
      SUPER_ADMIN_ONLY_KEY,
      profileMethod,
    ) as boolean | undefined;
    const method = Reflect.getMetadata(METHOD_METADATA, profileMethod) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, profileMethod) as
      | string
      | undefined;

    expect(isSuperAdminOnly).toBe(true);
    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe('profile');
  });
});
