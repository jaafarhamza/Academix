import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { USER_ROLES_KEY } from '../../auth/constants/user-auth.constants';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { StudentGroupController } from './student-group.controller';

describe('StudentGroupController', () => {
  const getStatus = jest.fn();
  const studentGroupService = {
    getStatus,
  };

  let controller: StudentGroupController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new StudentGroupController(studentGroupService as never);
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
});
