import { USER_PERMISSION_KEY } from '../constants/user-auth.constants';
import { RequirePermission } from './require-permission.decorator';

describe('RequirePermission decorator', () => {
  it('sets permission metadata on method', () => {
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

    expect(metadata).toBe('MANAGE_USERS');
  });
});
