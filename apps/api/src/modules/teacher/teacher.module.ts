import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CenterCostModule } from '../center-cost/center-cost.module';
import { TeacherController } from './controllers/teacher.controller';
import { TeacherService } from './services/teacher.service';

@Module({
  imports: [AuthModule, CenterCostModule],
  controllers: [TeacherController],
  providers: [TeacherService],
})
export class TeacherModule {}
