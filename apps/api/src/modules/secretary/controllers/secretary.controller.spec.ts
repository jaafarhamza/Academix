import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import {
  USER_PERMISSION_KEY,
  USER_ROLES_KEY,
} from '../../auth/constants/user-auth.constants';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SecretaryController } from './secretary.controller';

describe('SecretaryController', () => {
  const create = jest.fn();
  const findAll = jest.fn();
  const findOne = jest.fn();
  const update = jest.fn();
  const deactivate = jest.fn();
  const getStatus = jest.fn();
  const secretaryService = {
    create,
    findAll,
    findOne,
    update,
    deactivate,
    getStatus,
  };

  let controller: SecretaryController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SecretaryController(secretaryService as never);
  });

  it('delegates create secretary to service with center_id from current user', async () => {
    create.mockResolvedValueOnce({ id: 'secretary-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      firstName: 'Sara',
      lastName: 'Secretary',
      email: 'secretary.new@academix-demo.com',
      password: 'StrongPass1!',
      phone: '+212600000013',
      cin: 'CIN-SEC-002',
    };

    const result = await controller.create(currentUser, payload);

    expect(result).toEqual({ id: 'secretary-1' });
    expect(create).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      payload,
    );
  });

  it('delegates status check to secretary service', () => {
    getStatus.mockReturnValueOnce({ module: 'secretary', status: 'ready' });

    const result = controller.getStatus();

    expect(result).toEqual({ module: 'secretary', status: 'ready' });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('delegates list secretaries to service with current center context', async () => {
    findAll.mockResolvedValueOnce([{ id: 'secretary-1' }]);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const query = {
      search: 'sara',
      isActive: true,
      page: 1,
      limit: 20,
    };

    const result = await controller.findAll(currentUser, query);

    expect(result).toEqual([{ id: 'secretary-1' }]);
    expect(findAll).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      query,
    );
  });

  it('delegates secretary details lookup to service with current center context', async () => {
    findOne.mockResolvedValueOnce({ id: 'secretary-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };

    const result = await controller.findOne(currentUser, 'secretary-1');

    expect(result).toEqual({ id: 'secretary-1' });
    expect(findOne).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'secretary-1',
    );
  });

  it('delegates secretary update to service with current center context', async () => {
    update.mockResolvedValueOnce({ id: 'secretary-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      firstName: 'Updated Sara',
      phone: '+212600000015',
    };

    const result = await controller.update(currentUser, 'secretary-1', payload);

    expect(result).toEqual({ id: 'secretary-1' });
    expect(update).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'secretary-1',
      payload,
    );
  });

  it('delegates secretary deactivation to service with current center context', async () => {
    deactivate.mockResolvedValueOnce(undefined);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };

    await controller.remove(currentUser, 'secretary-1');

    expect(deactivate).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'secretary-1',
    );
  });

  it('uses app JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, SecretaryController) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(guards).toEqual([AppJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN role at class level', () => {
    const roles = Reflect.getMetadata(USER_ROLES_KEY, SecretaryController) as
      | UserRole[]
      | undefined;

    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it('maps status endpoint to GET /secretaries/status', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SecretaryController.prototype,
      'getStatus',
    );

    if (!descriptor?.value) {
      throw new Error('Expected getStatus descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe('status');
  });

  it('maps list endpoint to GET /secretaries', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SecretaryController.prototype,
      'findAll',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findAll descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe('/');
  });

  it('maps create endpoint to POST /secretaries', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SecretaryController.prototype,
      'create',
    );

    if (!descriptor?.value) {
      throw new Error('Expected create descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.POST);
    expect(path).toBe('/');
  });

  it('requires MANAGE_USERS permission on create endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SecretaryController.prototype,
      'create',
    );

    if (!descriptor?.value) {
      throw new Error('Expected create descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const requiredPermission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      handler,
    ) as PermissionAction | undefined;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(requiredPermission).toBe(PermissionAction.MANAGE_USERS);
    expect(guards).toEqual([PermissionsGuard]);
  });

  it('maps details endpoint to GET /secretaries/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SecretaryController.prototype,
      'findOne',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findOne descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe(':id');
  });

  it('requires MANAGE_USERS permission on list endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SecretaryController.prototype,
      'findAll',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findAll descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const requiredPermission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      handler,
    ) as PermissionAction | undefined;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(requiredPermission).toBe(PermissionAction.MANAGE_USERS);
    expect(guards).toEqual([PermissionsGuard]);
  });

  it('requires MANAGE_USERS permission on details endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SecretaryController.prototype,
      'findOne',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findOne descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const requiredPermission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      handler,
    ) as PermissionAction | undefined;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(requiredPermission).toBe(PermissionAction.MANAGE_USERS);
    expect(guards).toEqual([PermissionsGuard]);
  });

  it('maps update endpoint to PATCH /secretaries/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SecretaryController.prototype,
      'update',
    );

    if (!descriptor?.value) {
      throw new Error('Expected update descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.PATCH);
    expect(path).toBe(':id');
  });

  it('requires MANAGE_USERS permission on update endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SecretaryController.prototype,
      'update',
    );

    if (!descriptor?.value) {
      throw new Error('Expected update descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const requiredPermission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      handler,
    ) as PermissionAction | undefined;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(requiredPermission).toBe(PermissionAction.MANAGE_USERS);
    expect(guards).toEqual([PermissionsGuard]);
  });

  it('maps delete endpoint to DELETE /secretaries/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SecretaryController.prototype,
      'remove',
    );

    if (!descriptor?.value) {
      throw new Error('Expected remove descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.DELETE);
    expect(path).toBe(':id');
  });

  it('returns 204 status code on delete endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SecretaryController.prototype,
      'remove',
    );

    if (!descriptor?.value) {
      throw new Error('Expected remove descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA, handler) as
      | number
      | undefined;

    expect(httpCode).toBe(HttpStatus.NO_CONTENT);
  });

  it('requires MANAGE_USERS permission on delete endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SecretaryController.prototype,
      'remove',
    );

    if (!descriptor?.value) {
      throw new Error('Expected remove descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const requiredPermission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      handler,
    ) as PermissionAction | undefined;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(requiredPermission).toBe(PermissionAction.MANAGE_USERS);
    expect(guards).toEqual([PermissionsGuard]);
  });
});
