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
import { DashboardController } from './dashboard.controller';

describe('DashboardController', () => {
  const getFinancial = jest.fn();
  const dashboardService = {
    getFinancial,
  };

  let controller: DashboardController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DashboardController(dashboardService as never);
  });

  it('delegates the financial dashboard query with center_id from current user', async () => {
    getFinancial.mockResolvedValueOnce({ totals: { collected: 1200 } });
    const currentUser = {
      id: 'user-1',
      center_id: 'center-1',
      email: 'admin@academix.com',
      role: UserRole.ADMIN,
    };
    const query = {
      period: 'THIS_MONTH',
    };

    const result = await controller.getFinancial(currentUser, query);

    expect(result).toEqual({ totals: { collected: 1200 } });
    expect(getFinancial).toHaveBeenCalledWith('center-1', query);
  });

  it('uses app JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, DashboardController) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(guards).toEqual([AppJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN and SECRETARY roles at class level', () => {
    const roles = Reflect.getMetadata(USER_ROLES_KEY, DashboardController) as
      | UserRole[]
      | undefined;

    expect(roles).toEqual([UserRole.ADMIN, UserRole.SECRETARY]);
  });

  it('maps financial endpoint to GET /dashboard/financial', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      DashboardController.prototype,
      'getFinancial',
    );

    if (!descriptor?.value) {
      throw new Error('Expected getFinancial descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe('financial');
  });

  it('requires VIEW_REPORTS permission and permissions guard on financial endpoint', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      DashboardController.prototype,
      'getFinancial',
    );

    if (!descriptor?.value) {
      throw new Error('Expected getFinancial descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const permission = Reflect.getMetadata(USER_PERMISSION_KEY, handler) as
      | PermissionAction
      | undefined;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(permission).toBe(PermissionAction.VIEW_REPORTS);
    expect(guards).toEqual([PermissionsGuard]);
  });
});
