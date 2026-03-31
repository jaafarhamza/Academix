import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TeacherSubjectController } from './controllers/teacher-subject.controller';
import { TeacherSubjectService } from './services/teacher-subject.service';

@Module({
  imports: [AuthModule],
  controllers: [TeacherSubjectController],
  providers: [TeacherSubjectService],
})
export class TeacherSubjectModule {}
