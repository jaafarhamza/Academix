import { GUARDS_METADATA } from '@nestjs/common/constants';
import { USER_PERMISSION_KEY } from '../constants/user-auth.constants';
import { PermissionsGuard } from '../guards/permissions.guard';
import { UserJwtAuthGuard } from '../guards/user-jwt-auth.guard';
import { RequirePermission } from './require-permission.decorator';

describe('RequirePermission decorator', () => {
  it('sets permission metadata and guards on method', () => {
    class TestController {
      @RequirePermission('MANAGE_USERS')
      testMethod(): void {}
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      TestController.prototype,
      'testMethod',
    );

    if (!descriptor?.value) {
      throw new Error('Expected method descriptor to be defined');
    }

    const method = descriptor.value as object;
    const metadata = Reflect.getMetadata(USER_PERMISSION_KEY, method) as
      | string
      | undefined;
    const guards = Reflect.getMetadata(GUARDS_METADATA, method) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(metadata).toBe('MANAGE_USERS');
    expect(guards).toEqual([UserJwtAuthGuard, PermissionsGuard]);
  });

  it('sets permission metadata and guards on class', () => {
    @RequirePermission('VIEW_REPORTS')
    class TestController {}

    const metadata = Reflect.getMetadata(
      USER_PERMISSION_KEY,
      TestController,
    ) as string | undefined;
    const guards = Reflect.getMetadata(GUARDS_METADATA, TestController) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(metadata).toBe('VIEW_REPORTS');
    expect(guards).toEqual([UserJwtAuthGuard, PermissionsGuard]);
  });
});
