import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SecretaryController } from './controllers/secretary.controller';
import { SecretaryService } from './services/secretary.service';

@Module({
  imports: [AuthModule],
  controllers: [SecretaryController],
  providers: [SecretaryService],
})
export class SecretaryModule {}
