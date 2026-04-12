import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CenterCostController } from './controllers/center-cost.controller';
import { CenterCostService } from './services/center-cost.service';
import { CenterCostValueConstraint } from './validators/center-cost-value.validator';

@Module({
  imports: [AuthModule],
  controllers: [CenterCostController],
  providers: [CenterCostService, CenterCostValueConstraint],
})
export class CenterCostModule {}
