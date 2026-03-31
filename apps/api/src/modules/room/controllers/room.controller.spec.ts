import { HttpStatus } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
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
import { RoomController } from './room.controller';

describe('RoomController', () => {
  const create = jest.fn();
  const findAll = jest.fn();
  const findAvailable = jest.fn();
  const isBookedAt = jest.fn();
  const findOne = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();
  const getStatus = jest.fn();
  const roomService = {
    create,
    findAll,
    findAvailable,
    isBookedAt,
    findOne,
    update,
    remove,
    getStatus,
  };

  let controller: RoomController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new RoomController(roomService as never);
  });

  it('delegates room creation to service with current center context', async () => {
    create.mockResolvedValueOnce({ id: 'room-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      floor: 2,
      roomName: 'Room B2',
      isAvailable: true,
    };

    const result = await controller.create(currentUser, payload);

    expect(result).toEqual({ id: 'room-1' });
    expect(create).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      payload,
    );
  });

  it('delegates room list to service with query filters', async () => {
    findAll.mockResolvedValueOnce([{ id: 'room-1' }]);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const query = {
      floor: 1,
      isAvailable: true,
      page: 1,
      limit: 10,
    };

    const result = await controller.findAll(currentUser, query);

    expect(result).toEqual([{ id: 'room-1' }]);
    expect(findAll).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      query,
    );
  });

  it('delegates available room lookup to service with day/time query', async () => {
    findAvailable.mockResolvedValueOnce([{ id: 'room-2' }]);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const query = {
      day: DayOfWeek.MONDAY,
      start: '14:00',
      end: '16:00',
    };

    const result = await controller.findAvailable(currentUser, query);

    expect(result).toEqual([{ id: 'room-2' }]);
    expect(findAvailable).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      query,
    );
  });

  it('delegates room detail lookup to service', async () => {
    findOne.mockResolvedValueOnce({ id: 'room-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };

    const result = await controller.findOne(
      currentUser,
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );

    expect(result).toEqual({ id: 'room-1' });
    expect(findOne).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );
  });

  it('delegates room booking check to service', async () => {
    isBookedAt.mockResolvedValueOnce({
      room_id: '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      day: DayOfWeek.MONDAY,
      start: '09:00',
      end: '10:00',
      isBooked: true,
      conflictingSessions: 1,
    });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const query = {
      day: DayOfWeek.MONDAY,
      start: '09:00',
      end: '10:00',
    };

    const result = await controller.isBookedAt(
      currentUser,
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      query,
    );

    expect(result).toEqual({
      room_id: '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      day: DayOfWeek.MONDAY,
      start: '09:00',
      end: '10:00',
      isBooked: true,
      conflictingSessions: 1,
    });
    expect(isBookedAt).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      query,
    );
  });

  it('delegates room update to service', async () => {
    update.mockResolvedValueOnce({ id: 'room-1' });
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };
    const payload = {
      isAvailable: false,
    };

    const result = await controller.update(
      currentUser,
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      payload,
    );

    expect(result).toEqual({ id: 'room-1' });
    expect(update).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      payload,
    );
  });

  it('delegates room deletion to service', async () => {
    remove.mockResolvedValueOnce(undefined);
    const currentUser = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: UserRole.ADMIN,
    };

    await controller.remove(
      currentUser,
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );

    expect(remove).toHaveBeenCalledWith(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );
  });

  it('delegates status check to room service', () => {
    getStatus.mockReturnValueOnce({ module: 'room', status: 'ready' });

    const result = controller.getStatus();

    expect(result).toEqual({ module: 'room', status: 'ready' });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it('uses app JWT auth + roles guards at class level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, RoomController) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(guards).toEqual([AppJwtAuthGuard, RolesGuard]);
  });

  it('restricts access to ADMIN and SECRETARY roles at class level', () => {
    const roles = Reflect.getMetadata(USER_ROLES_KEY, RoomController) as
      | UserRole[]
      | undefined;

    expect(roles).toEqual([UserRole.ADMIN, UserRole.SECRETARY]);
  });

  it('maps create endpoint to POST /rooms', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
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

  it('maps list endpoint to GET /rooms', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
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

  it('maps available endpoint to GET /rooms/available', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
      'findAvailable',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findAvailable descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe('available');
  });

  it('maps status endpoint to GET /rooms/status', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
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

  it('maps detail endpoint to GET /rooms/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
      'findOne',
    );

    if (!descriptor?.value) {
      throw new Error('Expected findOne descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe(':id');
  });

  it('maps booking-check endpoint to GET /rooms/:id/is-booked', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
      'isBookedAt',
    );

    if (!descriptor?.value) {
      throw new Error('Expected isBookedAt descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;

    expect(method).toBe(RequestMethod.GET);
    expect(path).toBe(':id/is-booked');
  });

  it('maps update endpoint to PATCH /rooms/:id', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
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

  it('maps remove endpoint to DELETE /rooms/:id with 204 status code', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
      'remove',
    );

    if (!descriptor?.value) {
      throw new Error('Expected remove descriptor to be defined');
    }

    const handler = descriptor.value as object;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | RequestMethod
      | undefined;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;
    const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA, handler) as
      | HttpStatus
      | undefined;

    expect(method).toBe(RequestMethod.DELETE);
    expect(path).toBe(':id');
    expect(httpCode).toBe(HttpStatus.NO_CONTENT);
  });

  it('uses permissions guard for mutating/read endpoints', () => {
    const createDescriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
      'create',
    );
    const findAllDescriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
      'findAll',
    );
    const findAvailableDescriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
      'findAvailable',
    );
    const findOneDescriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
      'findOne',
    );
    const isBookedAtDescriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
      'isBookedAt',
    );
    const updateDescriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
      'update',
    );
    const removeDescriptor = Object.getOwnPropertyDescriptor(
      RoomController.prototype,
      'remove',
    );

    if (
      !createDescriptor?.value ||
      !findAllDescriptor?.value ||
      !findAvailableDescriptor?.value ||
      !isBookedAtDescriptor?.value ||
      !findOneDescriptor?.value ||
      !updateDescriptor?.value ||
      !removeDescriptor?.value
    ) {
      throw new Error('Expected route descriptors to be defined');
    }

    const createGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      createDescriptor.value as object,
    ) as unknown[] | undefined;
    const findAllGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      findAllDescriptor.value as object,
    ) as unknown[] | undefined;
    const findAvailableGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      findAvailableDescriptor.value as object,
    ) as unknown[] | undefined;
    const findOneGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      findOneDescriptor.value as object,
    ) as unknown[] | undefined;
    const isBookedAtGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      isBookedAtDescriptor.value as object,
    ) as unknown[] | undefined;
    const updateGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      updateDescriptor.value as object,
    ) as unknown[] | undefined;
    const removeGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      removeDescriptor.value as object,
    ) as unknown[] | undefined;

    expect(createGuards).toEqual([PermissionsGuard]);
    expect(findAllGuards).toEqual([PermissionsGuard]);
    expect(findAvailableGuards).toEqual([PermissionsGuard]);
    expect(isBookedAtGuards).toEqual([PermissionsGuard]);
    expect(findOneGuards).toEqual([PermissionsGuard]);
    expect(updateGuards).toEqual([PermissionsGuard]);
    expect(removeGuards).toEqual([PermissionsGuard]);
  });

  it('binds MANAGE_ROOMS permission metadata to mutating/read endpoints', () => {
    const descriptorNames: Array<
      | 'create'
      | 'findAll'
      | 'findAvailable'
      | 'isBookedAt'
      | 'findOne'
      | 'update'
      | 'remove'
    > = [
      'create',
      'findAll',
      'findAvailable',
      'isBookedAt',
      'findOne',
      'update',
      'remove',
    ];

    for (const descriptorName of descriptorNames) {
      const descriptor = Object.getOwnPropertyDescriptor(
        RoomController.prototype,
        descriptorName,
      );

      if (!descriptor?.value) {
        throw new Error(`Expected ${descriptorName} descriptor to be defined`);
      }

      const permission = Reflect.getMetadata(
        USER_PERMISSION_KEY,
        descriptor.value as object,
      ) as PermissionAction | undefined;

      expect(permission).toBe(PermissionAction.MANAGE_ROOMS);
    }
  });
});
