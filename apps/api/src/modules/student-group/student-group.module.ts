import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StudentGroupController } from './controllers/student-group.controller';
import { StudentGroupService } from './services/student-group.service';

@Module({
  imports: [AuthModule],
  controllers: [StudentGroupController],
  providers: [StudentGroupService],
})
export class StudentGroupModule {}
