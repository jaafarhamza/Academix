import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import { USER_ROLES_KEY } from '../../auth/constants/user-auth.constants';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CenterExpenseController } from './center-expense.controller';

describe('CenterExpenseController', () => {
  const getStatus = jest.fn();
  const centerExpenseService = {
    getStatus,
  };

  let controller: CenterExpenseController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CenterExpenseController(centerExpenseService as never);
  });

  it('delegates status check to center-expense service', () => {
    getStatus.mockReturnValueOnce({
      module: 'center-expense',
      status: 'ready',
    });

    expect(controller.getStatus()).toEqual({
      module: 'center-expense',
      status: 'ready',
    });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('uses app JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      CenterExpenseController,
    ) as unknown[];

    expect(guards).toEqual([AppJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN and SECRETARY roles at class level', () => {
    const roles = Reflect.getMetadata(
      USER_ROLES_KEY,
      CenterExpenseController,
    ) as UserRole[] | undefined;

    expect(roles).toEqual([UserRole.ADMIN, UserRole.SECRETARY]);
  });

  it('maps status endpoint to GET /center-expenses/status', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterExpenseController.prototype,
      'getStatus',
    );

    if (!descriptor?.value) {
      throw new Error('Expected status descriptor to be defined');
    }

    const controllerMethod = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, controllerMethod) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, controllerMethod) as
      | string
      | undefined;
    const httpCode = Reflect.getMetadata(
      HTTP_CODE_METADATA,
      controllerMethod,
    ) as number | undefined;

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe('status');
    expect(httpCode).toBeUndefined();
  });
});
