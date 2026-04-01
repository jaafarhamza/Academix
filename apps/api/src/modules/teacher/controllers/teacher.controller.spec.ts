import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import {
  USER_PERMISSION_KEY,
  USER_ROLES_KEY,
} from '../../auth/constants/user-auth.constants';
import { TeacherHoursPeriod } from '../dto/teacher-hours-query.dto';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { TeacherController } from './teacher.controller';

describe('TeacherController', () => {
  const create = jest.fn();
  const findAll = jest.fn();
  const findOne = jest.fn();
  const getHours = jest.fn();
  const update = jest.fn();
  const deactivate = jest.fn();
  const getStatus = jest.fn();
  const teacherService = {
    create,
    findAll,
    findOne,
    getHours,
    update,
    deactivate,
    getStatus,
  };

  let controller: TeacherController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TeacherController(teacherService as never);
  });

  it('delegates create teacher to service with center_id from current user', async () => {
    create.mockResolvedValueOnce({ id: 'teacher-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'teacher@academix-demo.com',
      password: 'StrongPass1!',
      phone: '+212600000030',
      cin: 'BE-12345',
    };

    const result = await controller.create(currentUser, payload);

    expect(result).toEqual({ id: 'teacher-1' });
    expect(create).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      payload,
    );
  });

  it('delegates status check to teacher service', () => {
    getStatus.mockReturnValueOnce({ module: 'teacher', status: 'ready' });

    const result = controller.getStatus();

    expect(result).toEqual({ module: 'teacher', status: 'ready' });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('delegates list teachers to service with current center context', async () => {
    findAll.mockResolvedValueOnce([{ id: 'teacher-1' }]);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const query = {
      search: 'fatima',
      isActive: true,
      page: 1,
      limit: 20,
    };

    const result = await controller.findAll(currentUser, query);

    expect(result).toEqual([{ id: 'teacher-1' }]);
    expect(findAll).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      query,
    );
  });

  it('delegates teacher details lookup to service with current center context', async () => {
    findOne.mockResolvedValueOnce({ id: 'teacher-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };

    const result = await controller.findOne(currentUser, 'teacher-1');

    expect(result).toEqual({ id: 'teacher-1' });
    expect(findOne).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
    );
  });

  it('delegates teacher hours lookup to service with current center context', async () => {
    getHours.mockResolvedValueOnce({
      teacher_id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      period: TeacherHoursPeriod.WEEK,
      hours: 12.5,
    });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };

    const result = await controller.getHours(currentUser, 'teacher-1', {
      period: TeacherHoursPeriod.WEEK,
    });

    expect(result).toEqual({
      teacher_id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      period: TeacherHoursPeriod.WEEK,
      hours: 12.5,
    });
    expect(getHours).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      TeacherHoursPeriod.WEEK,
    );
  });

  it('defaults teacher hours period to week when query period is missing', async () => {
    getHours.mockResolvedValueOnce({
      teacher_id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      period: TeacherHoursPeriod.WEEK,
      hours: 0,
    });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };

    await controller.getHours(currentUser, 'teacher-1', {} as never);

    expect(getHours).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      TeacherHoursPeriod.WEEK,
    );
  });

  it('delegates teacher update to service with current center context', async () => {
    update.mockResolvedValueOnce({ id: 'teacher-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      firstName: 'Updated Fatima',
      hourlyRate: 180,
    };

    const result = await controller.update(currentUser, 'teacher-1', payload);

    expect(result).toEqual({ id: 'teacher-1' });
    expect(update).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      payload,
    );
  });

  it('delegates teacher deactivation to service with current center context', async () => {
    deactivate.mockResolvedValueOnce(undefined);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };

    await controller.remove(currentUser, 'teacher-1');

    expect(deactivate).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
    );
  });

  it('uses app JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, TeacherController) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(guards).toEqual([AppJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN and SECRETARY roles at class level', () => {
    const roles = Reflect.getMetadata(USER_ROLES_KEY, TeacherController) as
      | UserRole[]
      | undefined;

    expect(roles).toEqual([UserRole.ADMIN, UserRole.SECRETARY]);
  });

  it('maps status endpoint to GET /teachers/status', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherController.prototype,
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

  it('maps create endpoint to POST /teachers', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherController.prototype,
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

  it('maps list endpoint to GET /teachers', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherController.prototype,
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

  it('requires MANAGE_USERS permission on create endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherController.prototype,
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
      TeacherController.prototype,
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

  it('maps details endpoint to GET /teachers/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherController.prototype,
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

  it('requires MANAGE_USERS permission on details endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherController.prototype,
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

  it('maps hours endpoint to GET /teachers/:id/hours', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherController.prototype,
      'getHours',
    );

    if (!descriptor?.value) {
      throw new Error('Expected getHours descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe(':id/hours');
  });

  it('requires MANAGE_USERS permission on hours endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherController.prototype,
      'getHours',
    );

    if (!descriptor?.value) {
      throw new Error('Expected getHours descriptor to be defined');
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

  it('maps update endpoint to PATCH /teachers/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherController.prototype,
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
      TeacherController.prototype,
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

  it('maps delete endpoint to DELETE /teachers/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherController.prototype,
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

  it('sets delete endpoint response status to 204 (No Content)', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherController.prototype,
      'remove',
    );

    if (!descriptor?.value) {
      throw new Error('Expected remove descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const statusCode = Reflect.getMetadata(HTTP_CODE_METADATA, handler) as
      | number
      | undefined;

    expect(statusCode).toBe(HttpStatus.NO_CONTENT);
  });

  it('requires MANAGE_USERS permission on delete endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherController.prototype,
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
