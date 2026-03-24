import { HttpStatus } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { IS_PUBLIC_KEY } from '../../../common/constants/public-route.constants';
import { SUPER_ADMIN_ONLY_KEY } from '../../super-admin/constants/super-admin-auth.constants';
import { CenterController } from './center.controller';

describe('CenterController', () => {
  const login = jest.fn();
  const register = jest.fn();
  const centerService = {
    login,
    register,
  };

  let controller: CenterController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CenterController(centerService as never);
  });

  it('delegates center login to service', async () => {
    login.mockResolvedValueOnce({ accessToken: 'token-1' });

    const payload = {
      email: 'admin@academix-demo.com',
      password: 'Academix.CenterAdmin.2026',
    };

    const result = await controller.login(payload);

    expect(result).toEqual({ accessToken: 'token-1' });
    expect(login).toHaveBeenCalledWith(payload);
  });

  it('delegates center registration to service with current super admin id', async () => {
    register.mockResolvedValueOnce({ id: 'center-1' });

    const superAdmin = {
      id: 'sa-1',
      email: 'superadmin@academix.com',
      role: 'SUPER_ADMIN' as const,
    };
    const payload = {
      firstName: 'Center',
      lastName: 'Owner',
      centerName: 'Academix Demo Center',
      email: 'admin@academix-demo.com',
      password: 'StrongPass1!',
      phone: '+212600000010',
    };

    const result = await controller.register(superAdmin, payload);

    expect(result).toEqual({ id: 'center-1' });
    expect(register).toHaveBeenCalledWith(payload, 'sa-1');
  });

  it('marks login endpoint as public and returns HTTP 200', () => {
    const loginDescriptor = Object.getOwnPropertyDescriptor(
      CenterController.prototype,
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

  it('marks register endpoint as super-admin-only', () => {
    const registerDescriptor = Object.getOwnPropertyDescriptor(
      CenterController.prototype,
      'register',
    );

    if (!registerDescriptor?.value) {
      throw new Error('Expected register descriptor to be defined');
    }

    const registerMethod = registerDescriptor.value as object;
    const isSuperAdminOnly = Reflect.getMetadata(
      SUPER_ADMIN_ONLY_KEY,
      registerMethod,
    ) as boolean | undefined;
    const method = Reflect.getMetadata(METHOD_METADATA, registerMethod) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, registerMethod) as
      | string
      | undefined;

    expect(isSuperAdminOnly).toBe(true);
    expect(method).toBe(RequestMethod.POST);
    expect(path).toBe('register');
  });
});
