import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoomController } from './controllers/room.controller';
import { RoomService } from './services/room.service';

@Module({
  imports: [AuthModule],
  controllers: [RoomController],
  providers: [RoomService],
})
export class RoomModule {}
