import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TeacherController } from './controllers/teacher.controller';
import { TeacherService } from './services/teacher.service';

@Module({
  imports: [AuthModule],
  controllers: [TeacherController],
  providers: [TeacherService],
})
export class TeacherModule {}
