import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StudentController } from './controllers/student.controller';
import { StudentService } from './services/student.service';

@Module({
  imports: [AuthModule],
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}
