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
import { StudentController } from './student.controller';

describe('StudentController', () => {
  const create = jest.fn();
  const findAll = jest.fn();
  const findOne = jest.fn();
  const update = jest.fn();
  const deactivate = jest.fn();
  const getStatus = jest.fn();
  const studentService = {
    create,
    findAll,
    findOne,
    update,
    deactivate,
    getStatus,
  };

  let controller: StudentController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new StudentController(studentService as never);
  });

  it('delegates create student to service with center_id from current user', async () => {
    create.mockResolvedValueOnce({ id: 'student-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      firstName: 'Imane',
      lastName: 'Student',
      email: 'student.new@academix-demo.com',
      password: 'StrongPass1!',
      phone: '+212600000031',
      parentPhone: '+212600000901',
      schoolName: 'Ibn Sina School',
      schoolCycle: 'COLLEGE',
      schoolYear: 'SECOND_YEAR',
    };

    const result = await controller.create(currentUser, payload);

    expect(result).toEqual({ id: 'student-1' });
    expect(create).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      payload,
    );
  });

  it('delegates status check to student service', () => {
    getStatus.mockReturnValueOnce({ module: 'student', status: 'ready' });

    const result = controller.getStatus();

    expect(result).toEqual({ module: 'student', status: 'ready' });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('delegates list students to service with current center context', async () => {
    findAll.mockResolvedValueOnce([{ id: 'student-1' }]);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const query = {
      groupId: '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      schoolCycle: 'COLLEGE',
      schoolYear: 'SECOND_YEAR',
      search: 'imane',
      isActive: true,
      page: 1,
      limit: 20,
    };

    const result = await controller.findAll(currentUser, query);

    expect(result).toEqual([{ id: 'student-1' }]);
    expect(findAll).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      query,
    );
  });

  it('delegates student detail lookup to service with current center context', async () => {
    findOne.mockResolvedValueOnce({ id: 'student-1' });
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

    expect(result).toEqual({ id: 'student-1' });
    expect(findOne).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );
  });

  it('delegates student update to service with current center context', async () => {
    update.mockResolvedValueOnce({ id: 'student-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      firstName: 'Updated Imane',
      schoolCycle: 'COLLEGE',
    };

    const result = await controller.update(
      currentUser,
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      payload,
    );

    expect(result).toEqual({ id: 'student-1' });
    expect(update).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      payload,
    );
  });

  it('delegates student deactivation to service with current center context', async () => {
    deactivate.mockResolvedValueOnce(undefined);
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

    expect(deactivate).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );
  });

  it('uses user JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, StudentController) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(guards).toEqual([AppJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN and SECRETARY roles at class level', () => {
    const roles = Reflect.getMetadata(USER_ROLES_KEY, StudentController) as
      | UserRole[]
      | undefined;

    expect(roles).toEqual([UserRole.ADMIN, UserRole.SECRETARY]);
  });

  it('maps status endpoint to GET /students/status', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentController.prototype,
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

  it('maps list endpoint to GET /students', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentController.prototype,
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

  it('maps create endpoint to POST /students', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentController.prototype,
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

  it('maps detail endpoint to GET /students/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentController.prototype,
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

  it('maps update endpoint to PATCH /students/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentController.prototype,
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

  it('maps delete endpoint to DELETE /students/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentController.prototype,
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
    const statusCode = Reflect.getMetadata(HTTP_CODE_METADATA, handler) as
      | number
      | undefined;

    expect(method).toBe(RequestMethod.DELETE);
    expect(path).toBe(':id');
    expect(statusCode).toBe(HttpStatus.NO_CONTENT);
  });

  it('requires MANAGE_USERS permission on create endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentController.prototype,
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

  it('requires MANAGE_USERS permission on list endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentController.prototype,
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

  it('requires MANAGE_USERS permission on detail endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentController.prototype,
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

  it('requires MANAGE_USERS permission on update endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentController.prototype,
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

  it('requires MANAGE_USERS permission on delete endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      StudentController.prototype,
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
