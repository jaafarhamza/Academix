import { HttpStatus } from '@nestjs/common';
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
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

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService as never);
  });

  it('delegates login to auth service', async () => {
    login.mockResolvedValueOnce({ accessToken: 'access-1' });

    const payload = {
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      password: 'Academix.AdminUser.2026',
    };

    const result = await controller.login(payload);

    expect(result).toEqual({ accessToken: 'access-1' });
    expect(login).toHaveBeenCalledWith(payload);
  });

  it('delegates refresh to auth service', async () => {
    refresh.mockResolvedValueOnce({ accessToken: 'access-2' });

    const payload = { refreshToken: 'refresh-token' };
    const result = await controller.refresh(payload);

    expect(result).toEqual({ accessToken: 'access-2' });
    expect(refresh).toHaveBeenCalledWith(payload);
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
