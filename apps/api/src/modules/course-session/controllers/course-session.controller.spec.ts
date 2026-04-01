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
  const findAll = jest.fn();
  const findTeacherWeeklySchedule = jest.fn();
  const findStudentSchedule = jest.fn();
  const cancel = jest.fn();
  const reschedule = jest.fn();
  const getStatus = jest.fn();
  const courseSessionService = {
    create,
    findAll,
    findTeacherWeeklySchedule,
    findStudentSchedule,
    cancel,
    reschedule,
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

  it('delegates list to course-session service with center scope', async () => {
    findAll.mockResolvedValueOnce([
      {
        id: 'session-1',
      },
    ]);
    const query = {
      page: 1,
      limit: 20,
    };

    const result = await controller.findAll(
      {
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      } as never,
      query,
    );

    expect(result).toEqual([
      {
        id: 'session-1',
      },
    ]);
    expect(findAll).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      query,
    );
  });

  it('delegates teacher weekly schedule to course-session service with center scope', async () => {
    findTeacherWeeklySchedule.mockResolvedValueOnce([
      {
        id: 'session-1',
      },
    ]);

    const result = await controller.findTeacherWeeklySchedule(
      {
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      } as never,
      '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
    );

    expect(result).toEqual([
      {
        id: 'session-1',
      },
    ]);
    expect(findTeacherWeeklySchedule).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
    );
  });

  it('delegates student schedule to course-session service with center scope', async () => {
    findStudentSchedule.mockResolvedValueOnce([
      {
        id: 'session-1',
      },
    ]);

    const result = await controller.findStudentSchedule(
      {
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      } as never,
      '343f6d33-80fe-4181-a053-3b059793ec68',
    );

    expect(result).toEqual([
      {
        id: 'session-1',
      },
    ]);
    expect(findStudentSchedule).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '343f6d33-80fe-4181-a053-3b059793ec68',
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

  it('delegates cancel to course-session service with center scope', async () => {
    cancel.mockResolvedValueOnce(undefined);

    await controller.cancel(
      {
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      } as never,
      '2ec52140-0015-44f6-a458-1760f5e6d793',
    );

    expect(cancel).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '2ec52140-0015-44f6-a458-1760f5e6d793',
    );
  });

  it('delegates reschedule to course-session service with center scope', async () => {
    reschedule.mockResolvedValueOnce({
      id: 'session-1',
    });
    const payload = {
      day: DayOfWeek.TUESDAY,
      start_time: '15:00',
      end_time: '16:00',
    };

    const result = await controller.reschedule(
      {
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      } as never,
      '2ec52140-0015-44f6-a458-1760f5e6d793',
      payload,
    );

    expect(result).toEqual({
      id: 'session-1',
    });
    expect(reschedule).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '2ec52140-0015-44f6-a458-1760f5e6d793',
      payload,
    );
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

  it('maps list endpoint to GET /sessions', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CourseSessionController.prototype,
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
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;
    const permission = Reflect.getMetadata(USER_PERMISSION_KEY, handler) as
      | PermissionAction
      | undefined;

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe('/');
    expect(guards).toEqual([PermissionsGuard]);
    expect(permission).toBe(PermissionAction.MANAGE_SCHEDULE);
  });

  it('maps teacher weekly schedule endpoint to GET /sessions/teacher/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CourseSessionController.prototype,
      'findTeacherWeeklySchedule',
    );

    if (!descriptor?.value) {
      throw new Error(
        'Expected findTeacherWeeklySchedule descriptor to be defined',
      );
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

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe('teacher/:id');
    expect(guards).toEqual([PermissionsGuard]);
    expect(permission).toBe(PermissionAction.MANAGE_SCHEDULE);
  });

  it('maps student schedule endpoint to GET /sessions/student/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CourseSessionController.prototype,
      'findStudentSchedule',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findStudentSchedule descriptor to be defined');
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

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe('student/:id');
    expect(guards).toEqual([PermissionsGuard]);
    expect(permission).toBe(PermissionAction.MANAGE_SCHEDULE);
  });

  it('maps cancel endpoint to PATCH /sessions/:id/cancel', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CourseSessionController.prototype,
      'cancel',
    );

    if (!descriptor?.value) {
      throw new Error('Expected cancel descriptor to be defined');
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

    expect(method).toBe(RequestMethod.PATCH);
    expect(path).toBe(':id/cancel');
    expect(guards).toEqual([PermissionsGuard]);
    expect(permission).toBe(PermissionAction.MANAGE_SCHEDULE);
  });

  it('maps reschedule endpoint to PATCH /sessions/:id/reschedule', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CourseSessionController.prototype,
      'reschedule',
    );

    if (!descriptor?.value) {
      throw new Error('Expected reschedule descriptor to be defined');
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

    expect(method).toBe(RequestMethod.PATCH);
    expect(path).toBe(':id/reschedule');
    expect(guards).toEqual([PermissionsGuard]);
    expect(permission).toBe(PermissionAction.MANAGE_SCHEDULE);
  });
});
