import { HttpStatus } from '@nestjs/common';
import {
  GUARDS_METADATA,
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
import { StudentGroupController } from './student-group.controller';

describe('StudentGroupController', () => {
  const create = jest.fn();
  const findAll = jest.fn();
  const findOne = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();
  const getStatus = jest.fn();
  const studentGroupService = {
    create,
    findAll,
    findOne,
    update,
    remove,
    getStatus,
  };

  let controller: StudentGroupController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new StudentGroupController(studentGroupService as never);
  });

  it('delegates create student-group to service with center_id from current user', async () => {
    create.mockResolvedValueOnce({ id: 'group-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      teacherSubjectId: 'f8fce604-79e6-4fa6-a3f0-83fd2e5661d9',
      name: 'Group A',
      schoolCycle: 'COLLEGE',
      schoolYear: 'FIRST_YEAR',
    };

    const result = await controller.create(currentUser, payload);

    expect(result).toEqual({ id: 'group-1' });
    expect(create).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      payload,
    );
  });

  it('delegates list student-groups to service with current center context', async () => {
    findAll.mockResolvedValueOnce([{ id: 'group-1' }]);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const query = {
      schoolCycle: 'COLLEGE',
      schoolYear: 'FIRST_YEAR',
      teacherId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      subjectId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      page: 1,
      limit: 20,
    };

    const result = await controller.findAll(currentUser, query);

    expect(result).toEqual([{ id: 'group-1' }]);
    expect(findAll).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      query,
    );
  });

  it('delegates student-group details to service with current center context', async () => {
    findOne.mockResolvedValueOnce({ id: 'group-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };

    const result = await controller.findOne(
      currentUser,
      'a93b5859-8efe-4f35-a943-e3ef3c2a7d5a',
    );

    expect(result).toEqual({ id: 'group-1' });
    expect(findOne).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'a93b5859-8efe-4f35-a943-e3ef3c2a7d5a',
    );
  });

  it('delegates student-group update to service with current center context', async () => {
    update.mockResolvedValueOnce({ id: 'group-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      name: 'Group B',
      schoolCycle: 'COLLEGE',
      schoolYear: 'SECOND_YEAR',
    };

    const result = await controller.update(
      currentUser,
      'a93b5859-8efe-4f35-a943-e3ef3c2a7d5a',
      payload,
    );

    expect(result).toEqual({ id: 'group-1' });
    expect(update).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'a93b5859-8efe-4f35-a943-e3ef3c2a7d5a',
      payload,
    );
  });

  it('delegates student-group deletion to service with current center context', async () => {
    remove.mockResolvedValueOnce(undefined);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };

    await controller.remove(
      currentUser,
      'a93b5859-8efe-4f35-a943-e3ef3c2a7d5a',
    );

    expect(remove).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'a93b5859-8efe-4f35-a943-e3ef3c2a7d5a',
    );
  });

  it('delegates status check to student-group service', () => {
    getStatus.mockReturnValueOnce({
      module: 'student-group',
      status: 'ready',
    });

    const result = controller.getStatus();

    expect(result).toEqual({ module: 'student-group', status: 'ready' });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('uses app JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      StudentGroupController,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;

    expect(guards).toEqual([AppJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN and SECRETARY roles at class level', () => {
    const roles = Reflect.getMetadata(
      USER_ROLES_KEY,
      StudentGroupController,
    ) as UserRole[] | undefined;

    expect(roles).toEqual([UserRole.ADMIN, UserRole.SECRETARY]);
  });

  it('maps status endpoint to GET /student-groups/status', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
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

  it('maps create endpoint to POST /student-groups', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
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

  it('maps list endpoint to GET /student-groups', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
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

  it('maps detail endpoint to GET /student-groups/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
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

  it('maps update endpoint to PATCH /student-groups/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
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

  it('maps remove endpoint to DELETE /student-groups/:id and returns 204', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
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

  it('requires MANAGE_GROUPS permission for create handler', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
      'create',
    );

    if (!descriptor?.value) {
      throw new Error('Expected create descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const permission = Reflect.getMetadata(USER_PERMISSION_KEY, handler) as
      | PermissionAction
      | undefined;

    expect(permission).toBe(PermissionAction.MANAGE_GROUPS);
  });

  it('requires MANAGE_GROUPS permission for list handler', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
      'findAll',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findAll descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const permission = Reflect.getMetadata(USER_PERMISSION_KEY, handler) as
      | PermissionAction
      | undefined;

    expect(permission).toBe(PermissionAction.MANAGE_GROUPS);
  });

  it('requires MANAGE_GROUPS permission for detail handler', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
      'findOne',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findOne descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const permission = Reflect.getMetadata(USER_PERMISSION_KEY, handler) as
      | PermissionAction
      | undefined;

    expect(permission).toBe(PermissionAction.MANAGE_GROUPS);
  });

  it('requires MANAGE_GROUPS permission for update handler', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
      'update',
    );

    if (!descriptor?.value) {
      throw new Error('Expected update descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const permission = Reflect.getMetadata(USER_PERMISSION_KEY, handler) as
      | PermissionAction
      | undefined;

    expect(permission).toBe(PermissionAction.MANAGE_GROUPS);
  });

  it('requires MANAGE_GROUPS permission for remove handler', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
      'remove',
    );

    if (!descriptor?.value) {
      throw new Error('Expected remove descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const permission = Reflect.getMetadata(USER_PERMISSION_KEY, handler) as
      | PermissionAction
      | undefined;

    expect(permission).toBe(PermissionAction.MANAGE_GROUPS);
  });

  it('adds permissions guard on create handler', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
      'create',
    );

    if (!descriptor?.value) {
      throw new Error('Expected create descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(guards).toEqual([PermissionsGuard]);
  });

  it('adds permissions guard on list handler', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
      'findAll',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findAll descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(guards).toEqual([PermissionsGuard]);
  });

  it('adds permissions guard on detail handler', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
      'findOne',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findOne descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(guards).toEqual([PermissionsGuard]);
  });

  it('adds permissions guard on update handler', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
      'update',
    );

    if (!descriptor?.value) {
      throw new Error('Expected update descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(guards).toEqual([PermissionsGuard]);
  });

  it('adds permissions guard on remove handler', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentGroupController.prototype,
      'remove',
    );

    if (!descriptor?.value) {
      throw new Error('Expected remove descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(guards).toEqual([PermissionsGuard]);
  });
});
