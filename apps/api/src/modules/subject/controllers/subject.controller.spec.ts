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
import { SubjectController } from './subject.controller';

describe('SubjectController', () => {
  const create = jest.fn();
  const findAll = jest.fn();
  const findOne = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();
  const getStatus = jest.fn();
  const subjectService = {
    create,
    findAll,
    findOne,
    update,
    remove,
    getStatus,
  };

  let controller: SubjectController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SubjectController(subjectService as never);
  });

  it('delegates create subject to service with center_id from current user', async () => {
    create.mockResolvedValueOnce({ id: 'subject-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      name: 'Mathematics',
      description: 'Core mathematics for middle school',
    };

    const result = await controller.create(currentUser, payload);

    expect(result).toEqual({ id: 'subject-1' });
    expect(create).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      payload,
    );
  });

  it('delegates list subjects to service with current center context', async () => {
    findAll.mockResolvedValueOnce([{ id: 'subject-1' }]);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const query = {
      search: 'math',
      page: 1,
      limit: 20,
    };

    const result = await controller.findAll(currentUser, query);

    expect(result).toEqual([{ id: 'subject-1' }]);
    expect(findAll).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      query,
    );
  });

  it('delegates subject detail lookup to service with current center context', async () => {
    findOne.mockResolvedValueOnce({ id: 'subject-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };

    const result = await controller.findOne(
      currentUser,
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );

    expect(result).toEqual({ id: 'subject-1' });
    expect(findOne).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );
  });

  it('delegates subject update to service with current center context', async () => {
    update.mockResolvedValueOnce({ id: 'subject-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      name: 'Advanced Mathematics',
    };

    const result = await controller.update(
      currentUser,
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      payload,
    );

    expect(result).toEqual({ id: 'subject-1' });
    expect(update).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      payload,
    );
  });

  it('delegates subject deletion to service with current center context', async () => {
    remove.mockResolvedValueOnce(undefined);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };

    await controller.remove(
      currentUser,
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );

    expect(remove).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );
  });

  it('delegates status check to subject service', () => {
    getStatus.mockReturnValueOnce({ module: 'subject', status: 'ready' });

    const result = controller.getStatus();

    expect(result).toEqual({ module: 'subject', status: 'ready' });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('uses app JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, SubjectController) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(guards).toEqual([AppJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN and SECRETARY roles at class level', () => {
    const roles = Reflect.getMetadata(USER_ROLES_KEY, SubjectController) as
      | UserRole[]
      | undefined;

    expect(roles).toEqual([UserRole.ADMIN, UserRole.SECRETARY]);
  });

  it('maps create endpoint to POST /subjects', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SubjectController.prototype,
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

  it('maps list endpoint to GET /subjects', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SubjectController.prototype,
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

  it('maps status endpoint to GET /subjects/status', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SubjectController.prototype,
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

  it('maps detail endpoint to GET /subjects/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SubjectController.prototype,
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

  it('maps update endpoint to PATCH /subjects/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SubjectController.prototype,
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

  it('maps remove endpoint to DELETE /subjects/:id and returns 204', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      SubjectController.prototype,
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
    const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA, handler) as
      | number
      | undefined;

    expect(method).toBe(RequestMethod.DELETE);
    expect(path).toBe(':id');
    expect(httpCode).toBe(HttpStatus.NO_CONTENT);
  });

  it('requires MANAGE_SUBJECTS permission for CRUD handlers', () => {
    const createPermission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      SubjectController.prototype.create,
    ) as PermissionAction | undefined;
    const findAllPermission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      SubjectController.prototype.findAll,
    ) as PermissionAction | undefined;
    const findOnePermission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      SubjectController.prototype.findOne,
    ) as PermissionAction | undefined;
    const updatePermission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      SubjectController.prototype.update,
    ) as PermissionAction | undefined;
    const removePermission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      SubjectController.prototype.remove,
    ) as PermissionAction | undefined;

    expect(createPermission).toBe(PermissionAction.MANAGE_SUBJECTS);
    expect(findAllPermission).toBe(PermissionAction.MANAGE_SUBJECTS);
    expect(findOnePermission).toBe(PermissionAction.MANAGE_SUBJECTS);
    expect(updatePermission).toBe(PermissionAction.MANAGE_SUBJECTS);
    expect(removePermission).toBe(PermissionAction.MANAGE_SUBJECTS);
  });

  it('adds permissions guard on CRUD handlers', () => {
    const createGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      SubjectController.prototype.create,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;
    const findAllGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      SubjectController.prototype.findAll,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;
    const findOneGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      SubjectController.prototype.findOne,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;
    const updateGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      SubjectController.prototype.update,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;
    const removeGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      SubjectController.prototype.remove,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;

    expect(createGuards).toEqual([PermissionsGuard]);
    expect(findAllGuards).toEqual([PermissionsGuard]);
    expect(findOneGuards).toEqual([PermissionsGuard]);
    expect(updateGuards).toEqual([PermissionsGuard]);
    expect(removeGuards).toEqual([PermissionsGuard]);
  });
});
