import {
  GUARDS_METADATA,
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
  const getStatus = jest.fn();
  const studentGroupService = {
    create,
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
});
