import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RoomStatusResponseDto } from '../dto/room-status-response.dto';
import { RoomService } from '../services/room.service';

@Controller('rooms')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get('status')
  getStatus(): RoomStatusResponseDto {
    return this.roomService.getStatus();
  }
}
