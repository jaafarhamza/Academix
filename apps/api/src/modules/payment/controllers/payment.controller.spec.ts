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
import { PaymentController } from './payment.controller';

describe('PaymentController', () => {
  const create = jest.fn();
  const findAll = jest.fn();
  const getStatus = jest.fn();
  const paymentService = {
    create,
    findAll,
    getStatus,
  };

  let controller: PaymentController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PaymentController(paymentService as never);
  });

  it('delegates payment creation to service with center_id from current user', async () => {
    create.mockResolvedValueOnce({ id: 'payment-1' });
    const currentUser = {
      id: 'user-1',
      center_id: 'center-1',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      student_id: 'student-1',
      teacher_id: 'teacher-1',
      amount: 400,
      paid_amount: 300,
    };

    const result = await controller.create(currentUser, payload);

    expect(result).toEqual({ id: 'payment-1' });
    expect(create).toHaveBeenCalledWith('center-1', payload);
  });

  it('delegates payment list to service with center_id from current user', async () => {
    findAll.mockResolvedValueOnce([{ id: 'payment-1' }]);
    const currentUser = {
      id: 'user-1',
      center_id: 'center-1',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const query = {
      student_id: 'student-1',
      status: 'PAID',
    };

    const result = await controller.findAll(currentUser, query);

    expect(result).toEqual([{ id: 'payment-1' }]);
    expect(findAll).toHaveBeenCalledWith('center-1', query);
  });

  it('delegates status check to payment service', () => {
    getStatus.mockReturnValueOnce({ module: 'payment', status: 'ready' });

    const result = controller.getStatus();

    expect(result).toEqual({ module: 'payment', status: 'ready' });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('uses app JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, PaymentController) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(guards).toEqual([AppJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN and SECRETARY roles at class level', () => {
    const roles = Reflect.getMetadata(USER_ROLES_KEY, PaymentController) as
      | UserRole[]
      | undefined;

    expect(roles).toEqual([UserRole.ADMIN, UserRole.SECRETARY]);
  });

  it('maps create endpoint to POST /payments', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      PaymentController.prototype,
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

  it('maps list endpoint to GET /payments', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      PaymentController.prototype,
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

  it('maps status endpoint to GET /payments/status', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      PaymentController.prototype,
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

  it('requires MANAGE_PAYMENTS permission and permissions guard on create', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      PaymentController.prototype,
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

    expect(permission).toBe(PermissionAction.MANAGE_PAYMENTS);
    expect(guards).toEqual([PermissionsGuard]);
  });

  it('requires MANAGE_PAYMENTS permission and permissions guard on list', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      PaymentController.prototype,
      'findAll',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findAll descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const permission = Reflect.getMetadata(USER_PERMISSION_KEY, handler) as
      | PermissionAction
      | undefined;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(permission).toBe(PermissionAction.MANAGE_PAYMENTS);
    expect(guards).toEqual([PermissionsGuard]);
  });
});
