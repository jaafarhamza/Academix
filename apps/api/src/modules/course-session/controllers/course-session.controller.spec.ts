import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import {
  DayOfWeek,
  PermissionAction,
  UserRole,
} from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import {
  USER_PERMISSION_KEY,
  USER_ROLES_KEY,
} from '../../auth/constants/user-auth.constants';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CourseSessionController } from './course-session.controller';

describe('CourseSessionController', () => {
  const create = jest.fn();
  const getStatus = jest.fn();
  const courseSessionService = {
    create,
    getStatus,
  };

  let controller: CourseSessionController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CourseSessionController(courseSessionService as never);
  });

  it('delegates create to course-session service with center scope', async () => {
    create.mockResolvedValueOnce({
      id: 'session-1',
    });
    const payload = {
      teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
      subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
      student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
      room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
      day: DayOfWeek.MONDAY,
      start_time: '14:00',
      end_time: '16:00',
    };

    const result = await controller.create(
      {
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      } as never,
      payload,
    );

    expect(result).toEqual({
      id: 'session-1',
    });
    expect(create).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      payload,
    );
  });

  it('delegates status check to course-session service', () => {
    getStatus.mockReturnValueOnce({
      module: 'course-session',
      status: 'ready',
    });

    const result = controller.getStatus();

    expect(result).toEqual({ module: 'course-session', status: 'ready' });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('uses app JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      CourseSessionController,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;

    expect(guards).toEqual([AppJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN and SECRETARY roles at class level', () => {
    const roles = Reflect.getMetadata(
      USER_ROLES_KEY,
      CourseSessionController,
    ) as UserRole[] | undefined;

    expect(roles).toEqual([UserRole.ADMIN, UserRole.SECRETARY]);
  });

  it('maps status endpoint to GET /sessions/status', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CourseSessionController.prototype,
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

  it('maps create endpoint to POST /sessions', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CourseSessionController.prototype,
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
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;
    const permission = Reflect.getMetadata(USER_PERMISSION_KEY, handler) as
      | PermissionAction
      | undefined;

    expect(method).toBe(RequestMethod.POST);
    expect(path).toBe('/');
    expect(guards).toEqual([PermissionsGuard]);
    expect(permission).toBe(PermissionAction.MANAGE_SCHEDULE);
  });
});
