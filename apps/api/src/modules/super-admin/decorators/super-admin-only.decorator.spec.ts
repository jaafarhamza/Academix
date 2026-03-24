import { GUARDS_METADATA } from '@nestjs/common/constants';
import { SUPER_ADMIN_ONLY_KEY } from '../constants/super-admin-auth.constants';
import { SuperAdminJwtAuthGuard } from '../guards/super-admin-jwt-auth.guard';
import { SuperAdminRoleGuard } from '../guards/super-admin-role.guard';
import { SuperAdminOnly } from './super-admin-only.decorator';

describe('SuperAdminOnly decorator', () => {
  it('sets super-admin metadata and guards on method', () => {
    class TestController {
      @SuperAdminOnly()
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
    const metadata = Reflect.getMetadata(SUPER_ADMIN_ONLY_KEY, method) as
      | boolean
      | undefined;
    const guards = Reflect.getMetadata(GUARDS_METADATA, method) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(metadata).toBe(true);
    expect(guards).toEqual([SuperAdminJwtAuthGuard, SuperAdminRoleGuard]);
  });

  it('sets super-admin metadata and guards on class', () => {
    @SuperAdminOnly()
    class TestController {}

    const metadata = Reflect.getMetadata(
      SUPER_ADMIN_ONLY_KEY,
      TestController,
    ) as boolean | undefined;
    const guards = Reflect.getMetadata(GUARDS_METADATA, TestController) as
      | (new (...args: unknown[]) => unknown)[]
      | undefined;

    expect(metadata).toBe(true);
    expect(guards).toEqual([SuperAdminJwtAuthGuard, SuperAdminRoleGuard]);
  });
});
