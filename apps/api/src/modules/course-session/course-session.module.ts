import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CourseSessionController } from './controllers/course-session.controller';
import { CourseSessionService } from './services/course-session.service';

@Module({
  imports: [AuthModule],
  controllers: [CourseSessionController],
  providers: [CourseSessionService],
})
export class CourseSessionModule {}
