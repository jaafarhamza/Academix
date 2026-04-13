import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { HttpStatus } from '@nestjs/common/enums/http-status.enum';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';
import {
  USER_PERMISSION_KEY,
  USER_ROLES_KEY,
} from '../../auth/constants/user-auth.constants';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CenterExpenseController } from './center-expense.controller';

describe('CenterExpenseController', () => {
  const create = jest.fn();
  const findAll = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();
  const getStatus = jest.fn();

  const centerExpenseService = {
    create,
    findAll,
    update,
    remove,
    getStatus,
  };

  const currentUser = {
    sub: 'admin-1',
    center_id: 'center-1',
    email: 'admin@academix.test',
    role: UserRole.ADMIN,
    permissions: [],
  };

  let controller: CenterExpenseController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CenterExpenseController(centerExpenseService as never);
  });

  it('delegates create to center-expense service with center scope', async () => {
    const payload = {
      user_id: 'user-1',
      amount: 420,
      description: 'Printer repair',
      date: '2026-04-13',
    };
    const expected = {
      id: 'expense-1',
      center_id: 'center-1',
      user_id: 'user-1',
      userName: 'Sarah Malik',
      userRole: UserRole.SECRETARY,
      amount: 420,
      description: 'Printer repair',
      date: '2026-04-13',
      created_at: '2026-04-13T08:00:00.000Z',
    };

    create.mockResolvedValueOnce(expected);

    await expect(
      controller.create(currentUser as never, payload),
    ).resolves.toEqual(expected);
    expect(create).toHaveBeenCalledWith('center-1', payload);
  });

  it('delegates list to center-expense service with center scope', async () => {
    const query = {
      page: 2,
      limit: 10,
    };
    const expected = [
      {
        id: 'expense-1',
        center_id: 'center-1',
        user_id: 'user-1',
        userName: 'Sarah Malik',
        userRole: UserRole.SECRETARY,
        amount: 420,
        description: 'Printer repair',
        date: '2026-04-13',
        created_at: '2026-04-13T08:00:00.000Z',
      },
    ];

    findAll.mockResolvedValueOnce(expected);

    await expect(
      controller.findAll(currentUser as never, query),
    ).resolves.toEqual(expected);
    expect(findAll).toHaveBeenCalledWith('center-1', query);
  });

  it('delegates list filters to center-expense service with center scope', async () => {
    const query = {
      user_id: 'user-1',
      month: '2026-04',
      page: 1,
      limit: 20,
    };

    findAll.mockResolvedValueOnce([]);

    await expect(
      controller.findAll(currentUser as never, query),
    ).resolves.toEqual([]);
    expect(findAll).toHaveBeenCalledWith('center-1', query);
  });

  it('delegates update to center-expense service with center scope', async () => {
    const payload = {
      amount: 500,
      description: 'Updated expense',
    };
    const expected = {
      id: 'expense-1',
      center_id: 'center-1',
      user_id: 'user-1',
      userName: 'Sarah Malik',
      userRole: UserRole.SECRETARY,
      amount: 500,
      description: 'Updated expense',
      date: '2026-04-13',
      created_at: '2026-04-13T08:00:00.000Z',
    };

    update.mockResolvedValueOnce(expected);

    await expect(
      controller.update(currentUser as never, 'expense-1', payload),
    ).resolves.toEqual(expected);
    expect(update).toHaveBeenCalledWith('center-1', 'expense-1', payload);
  });

  it('delegates delete to center-expense service with center scope', async () => {
    remove.mockResolvedValueOnce(undefined);

    await expect(
      controller.remove(currentUser as never, 'expense-1'),
    ).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith('center-1', 'expense-1');
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

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe('status');
  });

  it('maps create endpoint to POST /center-expenses', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterExpenseController.prototype,
      'create',
    );

    if (!descriptor?.value) {
      throw new Error('Expected create descriptor to be defined');
    }

    const controllerMethod = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, controllerMethod) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, controllerMethod) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.POST);
    expect(path).toBe('/');
  });

  it('maps list endpoint to GET /center-expenses', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterExpenseController.prototype,
      'findAll',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findAll descriptor to be defined');
    }

    const controllerMethod = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, controllerMethod) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, controllerMethod) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe('/');
  });

  it('maps update endpoint to PATCH /center-expenses/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterExpenseController.prototype,
      'update',
    );

    if (!descriptor?.value) {
      throw new Error('Expected update descriptor to be defined');
    }

    const controllerMethod = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, controllerMethod) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, controllerMethod) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.PATCH);
    expect(path).toBe(':id');
  });

  it('maps delete endpoint to DELETE /center-expenses/:id with 204', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterExpenseController.prototype,
      'remove',
    );

    if (!descriptor?.value) {
      throw new Error('Expected remove descriptor to be defined');
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

    expect(method).toBe(RequestMethod.DELETE);
    expect(path).toBe(':id');
    expect(httpCode).toBe(HttpStatus.NO_CONTENT);
  });

  it.each(['create', 'findAll', 'update', 'remove'] as const)(
    'protects %s with permissions guard and MANAGE_EXPENSES metadata',
    (methodName) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        CenterExpenseController.prototype,
        methodName,
      );

      if (!descriptor?.value) {
        throw new Error(`Expected ${methodName} descriptor to be defined`);
      }

      const controllerMethod = descriptor.value as object;
      const guards = Reflect.getMetadata(GUARDS_METADATA, controllerMethod) as
        | unknown[]
        | undefined;
      const permission = Reflect.getMetadata(
        USER_PERMISSION_KEY,
        controllerMethod,
      ) as PermissionAction | undefined;

      expect(guards).toContain(PermissionsGuard);
      expect(permission).toBe(PermissionAction.MANAGE_EXPENSES);
    },
  );
});
