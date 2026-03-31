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
import { EnrollmentController } from './enrollment.controller';

describe('EnrollmentController', () => {
  const create = jest.fn();
  const getStatus = jest.fn();
  const enrollmentService = {
    create,
    getStatus,
  };

  let controller: EnrollmentController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new EnrollmentController(enrollmentService as never);
  });

  it('delegates enrollment creation to service with center_id from current user', async () => {
    create.mockResolvedValueOnce({ id: 'enrollment-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      studentId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      studentGroupId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
      enrollmentDate: '2026-04-01',
    };

    const result = await controller.create(currentUser, payload);

    expect(result).toEqual({ id: 'enrollment-1' });
    expect(create).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      payload,
    );
  });

  it('delegates status check to enrollment service', () => {
    getStatus.mockReturnValueOnce({ module: 'enrollment', status: 'ready' });

    const result = controller.getStatus();

    expect(result).toEqual({ module: 'enrollment', status: 'ready' });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('uses app JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      EnrollmentController,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;

    expect(guards).toEqual([AppJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN and SECRETARY roles at class level', () => {
    const roles = Reflect.getMetadata(USER_ROLES_KEY, EnrollmentController) as
      | UserRole[]
      | undefined;

    expect(roles).toEqual([UserRole.ADMIN, UserRole.SECRETARY]);
  });

  it('maps create endpoint to POST /enrollments', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      EnrollmentController.prototype,
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

  it('maps status endpoint to GET /enrollments/status', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      EnrollmentController.prototype,
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

  it('requires MANAGE_GROUPS permission and permissions guard on create', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      EnrollmentController.prototype,
      'create',
    );

    if (!descriptor?.value) {
      throw new Error('Expected create descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const permission = Reflect.getMetadata(USER_PERMISSION_KEY, handler) as
      | PermissionAction
      | undefined;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(permission).toBe(PermissionAction.MANAGE_GROUPS);
    expect(guards).toEqual([PermissionsGuard]);
  });
});
