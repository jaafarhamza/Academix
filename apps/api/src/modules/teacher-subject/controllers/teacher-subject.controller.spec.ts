import { GUARDS_METADATA } from '@nestjs/common/constants';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import {
  USER_PERMISSION_KEY,
  USER_ROLES_KEY,
} from '../../auth/constants/user-auth.constants';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { TeacherSubjectController } from './teacher-subject.controller';

describe('TeacherSubjectController', () => {
  const create = jest.fn();
  const findAll = jest.fn();
  const getStatus = jest.fn();
  const teacherSubjectService = {
    create,
    findAll,
    getStatus,
  };

  let controller: TeacherSubjectController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TeacherSubjectController(teacherSubjectService as never);
  });

  it('delegates create assignment to service with center_id from current user', async () => {
    create.mockResolvedValueOnce({ id: 'assignment-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      teacherId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      subjectId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
    };

    const result = await controller.create(currentUser, payload);

    expect(result).toEqual({ id: 'assignment-1' });
    expect(create).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      payload,
    );
  });

  it('delegates list teacher-subjects to service with current center context', async () => {
    findAll.mockResolvedValueOnce([{ id: 'assignment-1' }]);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const query = {
      teacherId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      subjectId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      page: 1,
      limit: 20,
    };

    const result = await controller.findAll(currentUser, query);

    expect(result).toEqual([{ id: 'assignment-1' }]);
    expect(findAll).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      query,
    );
  });

  it('delegates status check to teacher-subject service', () => {
    getStatus.mockReturnValueOnce({
      module: 'teacher-subject',
      status: 'ready',
    });

    const result = controller.getStatus();

    expect(result).toEqual({ module: 'teacher-subject', status: 'ready' });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('uses app JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      TeacherSubjectController,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;

    expect(guards).toEqual([AppJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN and SECRETARY roles at class level', () => {
    const roles = Reflect.getMetadata(
      USER_ROLES_KEY,
      TeacherSubjectController,
    ) as UserRole[] | undefined;

    expect(roles).toEqual([UserRole.ADMIN, UserRole.SECRETARY]);
  });

  it('maps create endpoint to POST /teacher-subjects', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherSubjectController.prototype,
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

  it('maps status endpoint to GET /teacher-subjects/status', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherSubjectController.prototype,
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

  it('maps list endpoint to GET /teacher-subjects', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      TeacherSubjectController.prototype,
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

  it('requires MANAGE_SUBJECTS permission for create and list handlers', () => {
    const createPermission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      TeacherSubjectController.prototype.create,
    ) as PermissionAction | undefined;
    const listPermission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      TeacherSubjectController.prototype.findAll,
    ) as PermissionAction | undefined;

    expect(createPermission).toBe(PermissionAction.MANAGE_SUBJECTS);
    expect(listPermission).toBe(PermissionAction.MANAGE_SUBJECTS);
  });

  it('adds permissions guard on create and list handlers', () => {
    const createGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      TeacherSubjectController.prototype.create,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;
    const listGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      TeacherSubjectController.prototype.findAll,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;

    expect(createGuards).toEqual([PermissionsGuard]);
    expect(listGuards).toEqual([PermissionsGuard]);
  });
});
