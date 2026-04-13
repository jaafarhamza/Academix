import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CenterExpenseController } from './controllers/center-expense.controller';
import { CenterExpenseService } from './services/center-expense.service';

@Module({
  imports: [AuthModule],
  controllers: [CenterExpenseController],
  providers: [CenterExpenseService],
})
export class CenterExpenseModule {}
