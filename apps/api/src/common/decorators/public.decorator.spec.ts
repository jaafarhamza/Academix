import 'reflect-metadata';
import { IS_PUBLIC_KEY } from '../constants/public-route.constants';
import { Public } from './public.decorator';

describe('Public decorator', () => {
  it('sets public metadata on target method', () => {
    class TestController {
      @Public()
      method(): void {}
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      TestController.prototype,
      'method',
    );

    if (!descriptor?.value) {
      throw new Error('Expected method descriptor to be defined');
    }

    const method = descriptor.value as object;
    const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, method) as
      | boolean
      | undefined;

    expect(metadata).toBe(true);
  });
});
