import { MODULE_METADATA } from '@nestjs/common/constants';
import { AuthModule } from '../auth/auth.module';
import { CenterExpenseController } from './controllers/center-expense.controller';
import { CenterExpenseModule } from './center-expense.module';
import { CenterExpenseService } from './services/center-expense.service';

describe('CenterExpenseModule', () => {
  it('registers auth module, controller, and provider', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      CenterExpenseModule,
    ) as unknown[];
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      CenterExpenseModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      CenterExpenseModule,
    ) as unknown[];

    expect(imports).toEqual([AuthModule]);
    expect(controllers).toEqual([CenterExpenseController]);
    expect(providers).toEqual([CenterExpenseService]);
  });
});
