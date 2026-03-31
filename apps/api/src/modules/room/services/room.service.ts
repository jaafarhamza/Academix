import { Injectable } from '@nestjs/common';
import { RoomStatusResponseDto } from '../dto/room-status-response.dto';

@Injectable()
export class RoomService {
  getStatus(): RoomStatusResponseDto {
    return {
      module: 'room',
      status: 'ready',
    };
  }
}
