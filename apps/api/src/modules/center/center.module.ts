import { Module } from '@nestjs/common';
import { CenterController } from './controllers/center.controller';
import { CenterService } from './services/center.service';

@Module({
  controllers: [CenterController],
  providers: [CenterService],
})
export class CenterModule {}
