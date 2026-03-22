import { Module } from '@nestjs/common';
import { SuperAdminModule } from '../super-admin/super-admin.module';
import { CenterController } from './controllers/center.controller';
import { CenterService } from './services/center.service';

@Module({
  imports: [SuperAdminModule],
  controllers: [CenterController],
  providers: [CenterService],
})
export class CenterModule {}
