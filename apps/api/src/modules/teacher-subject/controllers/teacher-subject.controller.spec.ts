import { GUARDS_METADATA } from '@nestjs/common/constants';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { USER_ROLES_KEY } from '../../auth/constants/user-auth.constants';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { TeacherSubjectController } from './teacher-subject.controller';

describe('TeacherSubjectController', () => {
  const getStatus = jest.fn();
  const teacherSubjectService = {
    getStatus,
  };

  let controller: TeacherSubjectController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TeacherSubjectController(teacherSubjectService as never);
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
});
