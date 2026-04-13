import { MODULE_METADATA } from '@nestjs/common/constants';
import { AuthModule } from '../auth/auth.module';
import { CenterCostController } from './controllers/center-cost.controller';
import { CenterCostValueConstraint } from './validators/center-cost-value.validator';
import { CenterCostModule } from './center-cost.module';
import { CenterCostService } from './services/center-cost.service';

describe('CenterCostModule', () => {
  it('registers auth module, controller, providers, and exports the service', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      CenterCostModule,
    ) as unknown[];
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      CenterCostModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      CenterCostModule,
    ) as unknown[];
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      CenterCostModule,
    ) as unknown[];

    expect(imports).toEqual([AuthModule]);
    expect(controllers).toEqual([CenterCostController]);
    expect(providers).toEqual([CenterCostService, CenterCostValueConstraint]);
    expect(exports).toEqual([CenterCostService]);
  });
});
