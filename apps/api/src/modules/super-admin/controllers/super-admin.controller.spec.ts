import { HttpStatus } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { IS_PUBLIC_KEY } from '../../../common/constants/public-route.constants';
import { SUPER_ADMIN_ONLY_KEY } from '../constants/super-admin-auth.constants';
import { SuperAdminController } from './super-admin.controller';

describe('SuperAdminController', () => {
  const login = jest.fn();
  const getProfile = jest.fn();
  const superAdminService = {
    login,
    getProfile,
  };

  let controller: SuperAdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SuperAdminController(superAdminService as never);
  });

  it('delegates login to service', async () => {
    login.mockResolvedValueOnce({ accessToken: 'token-1' });

    const payload = {
      email: 'superadmin@academix.com',
      password: 'Academix.SuperAdmin.2026',
    };

    const result = await controller.login(payload);

    expect(result).toEqual({ accessToken: 'token-1' });
    expect(login).toHaveBeenCalledWith(payload);
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
