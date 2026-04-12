import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';
import {
  USER_PERMISSION_KEY,
  USER_ROLES_KEY,
} from '../../auth/constants/user-auth.constants';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CenterCostController } from './center-cost.controller';

describe('CenterCostController', () => {
  const create = jest.fn();
  const findAll = jest.fn();
  const update = jest.fn();
  const getStatus = jest.fn();
  const centerCostService = {
    create,
    findAll,
    update,
    getStatus,
  };

  let controller: CenterCostController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CenterCostController(centerCostService as never);
  });

  it('delegates create center-cost to service with center_id from current user', async () => {
    create.mockResolvedValueOnce({ id: 'cost-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      name: 'Center Commission',
      deduction_type: 'PERCENTAGE_OF_TOTAL',
      value: 12.5,
    };

    const result = await controller.create(currentUser, payload as never);

    expect(result).toEqual({ id: 'cost-1' });
    expect(create).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      payload,
    );
  });

  it('delegates status check to center-cost service', () => {
    getStatus.mockReturnValueOnce({
      module: 'center-cost',
      status: 'ready',
    });

    expect(controller.getStatus()).toEqual({
      module: 'center-cost',
      status: 'ready',
    });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('delegates list center-costs to service with current center context', async () => {
    findAll.mockResolvedValueOnce([{ id: 'cost-1' }]);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const query = {
      scope: 'GLOBAL',
      page: 1,
      limit: 20,
    };

    const result = await controller.findAll(currentUser, query as never);

    expect(result).toEqual([{ id: 'cost-1' }]);
    expect(findAll).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      query,
    );
  });

  it('delegates center-cost update to service with current center context', async () => {
    update.mockResolvedValueOnce({ id: 'cost-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      teacher_id: null,
      value: 18,
    };

    const result = await controller.update(
      currentUser,
      '8fd24434-d78c-4f0e-872f-0bc6d4249795',
      payload as never,
    );

    expect(result).toEqual({ id: 'cost-1' });
    expect(update).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '8fd24434-d78c-4f0e-872f-0bc6d4249795',
      payload,
    );
  });

  it('uses app JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      CenterCostController,
    ) as unknown[];

    expect(guards).toEqual([AppJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN and SECRETARY roles at class level', () => {
    const roles = Reflect.getMetadata(USER_ROLES_KEY, CenterCostController) as
      | UserRole[]
      | undefined;

    expect(roles).toEqual([UserRole.ADMIN, UserRole.SECRETARY]);
  });

  it('maps status endpoint to GET /center-costs/status', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterCostController.prototype,
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

  it('maps create endpoint to POST /center-costs', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterCostController.prototype,
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

  it('maps list endpoint to GET /center-costs', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterCostController.prototype,
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

  it('maps update endpoint to PATCH /center-costs/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterCostController.prototype,
      'update',
    );

    if (!descriptor?.value) {
      throw new Error('Expected update descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.PATCH);
    expect(path).toBe(':id');
  });

  it('requires MANAGE_COSTS permission on create endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterCostController.prototype,
      'create',
    );

    if (!descriptor?.value) {
      throw new Error('Expected create descriptor to be defined');
    }

    const permission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      descriptor.value as object,
    ) as PermissionAction | undefined;

    expect(permission).toBe(PermissionAction.MANAGE_COSTS);
  });

  it('requires MANAGE_COSTS permission on list endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterCostController.prototype,
      'findAll',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findAll descriptor to be defined');
    }

    const permission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      descriptor.value as object,
    ) as PermissionAction | undefined;

    expect(permission).toBe(PermissionAction.MANAGE_COSTS);
  });

  it('requires MANAGE_COSTS permission on update endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterCostController.prototype,
      'update',
    );

    if (!descriptor?.value) {
      throw new Error('Expected update descriptor to be defined');
    }

    const permission = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      descriptor.value as object,
    ) as PermissionAction | undefined;

    expect(permission).toBe(PermissionAction.MANAGE_COSTS);
  });

  it('adds permissions guard on create handler', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterCostController.prototype,
      'create',
    );

    if (!descriptor?.value) {
      throw new Error('Expected create descriptor to be defined');
    }

    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      descriptor.value as object,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;

    expect(guards).toEqual([PermissionsGuard]);
  });

  it('adds permissions guard on list handler', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterCostController.prototype,
      'findAll',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findAll descriptor to be defined');
    }

    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      descriptor.value as object,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;

    expect(guards).toEqual([PermissionsGuard]);
  });

  it('adds permissions guard on update handler', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CenterCostController.prototype,
      'update',
    );

    if (!descriptor?.value) {
      throw new Error('Expected update descriptor to be defined');
    }

    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      descriptor.value as object,
    ) as (new (...args: unknown[]) => unknown)[] | undefined;

    expect(guards).toEqual([PermissionsGuard]);
  });
});
