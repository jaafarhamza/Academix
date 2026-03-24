import { USER_ROLES_KEY } from '../constants/user-auth.constants';
import { Roles } from './roles.decorator';

describe('Roles decorator', () => {
  it('sets roles metadata on method', () => {
    class TestController {
      @Roles('ADMIN', 'SECRETARY')
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
    const metadata = Reflect.getMetadata(USER_ROLES_KEY, method) as
      | string[]
      | undefined;

    expect(metadata).toEqual(['ADMIN', 'SECRETARY']);
  });
});
