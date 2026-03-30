import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SubjectController } from './controllers/subject.controller';
import { SubjectService } from './services/subject.service';

@Module({
  imports: [AuthModule],
  controllers: [SubjectController],
  providers: [SubjectService],
})
export class SubjectModule {}
