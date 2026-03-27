import { HttpStatus } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { IS_PUBLIC_KEY } from '../../../common/constants/public-route.constants';
import { CenterController } from './center.controller';

describe('CenterController', () => {
  const login = jest.fn();
  const refresh = jest.fn();
  const register = jest.fn();
  const getProfile = jest.fn();
  const updateProfile = jest.fn();
  const changePassword = jest.fn();
  const uploadLogo = jest.fn();
  const centerService = {
    login,
    refresh,
    register,
    getProfile,
    updateProfile,
    changePassword,
    uploadLogo,
  };
  const getConfig = jest.fn();
  const configService = { get: getConfig };

  let controller: CenterController;

  beforeEach(() => {
    jest.clearAllMocks();
    getConfig.mockImplementation((key: string) => {
      const values: Record<string, unknown> = {
        'centerAuth.refreshCookieName': 'academix_center_refresh_token',
        'centerAuth.refreshCookiePath': '/centers/refresh',
        'centerAuth.refreshCookieDomain': '',
        'centerAuth.refreshCookieSecure': false,
        'centerAuth.refreshCookieSameSite': 'lax',
        'centerAuth.refreshCookieMaxAgeMs': 604_800_000,
      };

      return values[key];
    });
    controller = new CenterController(
      centerService as never,
      configService as never,
    );
  });

  it('delegates center login to service', async () => {
    login.mockResolvedValueOnce({
      accessToken: 'token-1',
      tokenType: 'Bearer',
      expiresIn: '1h',
      center: {
        id: 'center-1',
        centerName: 'Academix Demo Center',
        email: 'admin@academix-demo.com',
        subdomain: 'academix-demo',
        role: 'ADMIN',
      },
      refreshToken: 'refresh-1',
      refreshExpiresIn: '7d',
    });

    const payload = {
      email: 'admin@academix-demo.com',
      password: 'Academix.CenterAdmin.2026',
    };

    const response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    const result = await controller.login(payload, response as never);

    expect(result.accessToken).toBe('token-1');
    expect(login).toHaveBeenCalledWith(payload);
    expect(response.cookie).toHaveBeenCalled();
  });

  it('delegates center registration to service', async () => {
    register.mockResolvedValueOnce({ id: 'center-1' });

    const payload = {
      firstName: 'Center',
      lastName: 'Owner',
      centerName: 'Academix Demo Center',
      email: 'admin@academix-demo.com',
      password: 'StrongPass1!',
      phone: '+212600000010',
    };

    const result = await controller.register(payload);

    expect(result).toEqual({ id: 'center-1' });
    expect(register).toHaveBeenCalledWith(payload);
  });

  it('delegates refresh to service and sets refresh cookie', async () => {
    refresh.mockResolvedValueOnce({
      accessToken: 'token-2',
      tokenType: 'Bearer',
      expiresIn: '1h',
      center: {
        id: 'center-1',
        centerName: 'Academix Demo Center',
        email: 'admin@academix-demo.com',
        subdomain: 'academix-demo',
        role: 'ADMIN',
      },
      refreshToken: 'refresh-2',
      refreshExpiresIn: '7d',
    });

    const request = {
      cookies: {
        academix_center_refresh_token: 'cookie-refresh-token',
      },
    };
    const response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    const result = await controller.refresh(
      request as never,
      { refreshToken: 'body-refresh-token' },
      response as never,
    );

    expect(result.accessToken).toBe('token-2');
    expect(refresh).toHaveBeenCalledWith('cookie-refresh-token');
    expect(response.cookie).toHaveBeenCalled();
  });

  it('delegates getProfile to service with authenticated center id', async () => {
    getProfile.mockResolvedValueOnce({ id: 'center-1' });

    const result = await controller.getProfile({
      id: 'center-1',
      center_id: 'center-1',
      email: 'admin@academix-demo.com',
      role: 'ADMIN',
      subdomain: 'academix-demo',
    });

    expect(result).toEqual({ id: 'center-1' });
    expect(getProfile).toHaveBeenCalledWith('center-1');
  });

  it('delegates updateProfile to service with authenticated center id', async () => {
    updateProfile.mockResolvedValueOnce({
      id: 'center-1',
      firstName: 'Updated',
    });

    const payload = {
      firstName: 'Updated',
      centerName: 'Academix Updated Center',
    };

    const result = await controller.updateProfile(
      {
        id: 'center-1',
        center_id: 'center-1',
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
        subdomain: 'academix-demo',
      },
      payload,
    );

    expect(result).toEqual({
      id: 'center-1',
      firstName: 'Updated',
    });
    expect(updateProfile).toHaveBeenCalledWith('center-1', payload);
  });

  it('delegates changePassword to service with authenticated center id', async () => {
    const payload = {
      currentPassword: 'Academix.CenterAdmin.2026',
      newPassword: 'NewStrongPass1!',
      confirmPassword: 'NewStrongPass1!',
    };

    await controller.changePassword(
      {
        id: 'center-1',
        center_id: 'center-1',
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
        subdomain: 'academix-demo',
      },
      payload,
    );

    expect(changePassword).toHaveBeenCalledWith('center-1', payload);
  });

  it('delegates uploadLogo to service with authenticated center id', async () => {
    const file = {
      buffer: Buffer.from('file-content'),
      mimetype: 'image/png',
      originalname: 'logo.png',
      size: 12,
    };
    uploadLogo.mockResolvedValueOnce({
      logoUrl:
        'http://localhost:9000/academix-center-assets/centers/center-1/logos/logo.png',
    });

    const result = await controller.uploadLogo(
      {
        id: 'center-1',
        center_id: 'center-1',
        email: 'admin@academix-demo.com',
        role: 'ADMIN',
        subdomain: 'academix-demo',
      },
      file,
    );

    expect(result.logoUrl).toContain('/centers/center-1/logos/');
    expect(uploadLogo).toHaveBeenCalledWith('center-1', file);
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

  it('marks register endpoint as public', () => {
    const registerDescriptor = Object.getOwnPropertyDescriptor(
      CenterController.prototype,
      'register',
    );

    if (!registerDescriptor?.value) {
      throw new Error('Expected register descriptor to be defined');
    }

    const registerMethod = registerDescriptor.value as object;
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, registerMethod) as
      | boolean
      | undefined;
    const method = Reflect.getMetadata(METHOD_METADATA, registerMethod) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, registerMethod) as
      | string
      | undefined;

    expect(isPublic).toBe(true);
    expect(method).toBe(RequestMethod.POST);
    expect(path).toBe('register');
  });
});
