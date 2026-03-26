import { GUARDS_METADATA } from '@nestjs/common/constants';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { UserRole } from '../../../generated/prisma/enums';
import { USER_ROLES_KEY } from '../../auth/constants/user-auth.constants';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserJwtAuthGuard } from '../../auth/guards/user-jwt-auth.guard';
import { StudentController } from './student.controller';

describe('StudentController', () => {
  const getStatus = jest.fn();
  const studentService = {
    getStatus,
  };

  let controller: StudentController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new StudentController(studentService as never);
  });

  it('delegates status check to student service', () => {
    getStatus.mockReturnValueOnce({ module: 'student', status: 'ready' });

    const result = controller.getStatus();

    expect(result).toEqual({ module: 'student', status: 'ready' });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('uses user JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, StudentController) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(guards).toEqual([UserJwtAuthGuard, RolesGuard]);
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
});
