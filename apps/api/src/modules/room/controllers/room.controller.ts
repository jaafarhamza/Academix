import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { USER_PERMISSION_KEY } from '../../auth/constants/user-auth.constants';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CheckRoomBookingDto } from '../dto/check-room-booking.dto';
import { CreateRoomDto } from '../dto/create-room.dto';
import { QueryRoomDto } from '../dto/query-room.dto';
import { RoomBookingResponseDto } from '../dto/room-booking-response.dto';
import { RoomDetailResponseDto } from '../dto/room-detail-response.dto';
import { RoomResponseDto } from '../dto/room-response.dto';
import { RoomScheduleResponseDto } from '../dto/room-schedule-response.dto';
import { RoomStatusResponseDto } from '../dto/room-status-response.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { RoomService } from '../services/room.service';

@Controller('rooms')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_ROOMS)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateRoomDto,
  ): Promise<RoomResponseDto> {
    return this.roomService.create(user.center_id, payload);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_ROOMS)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryRoomDto,
  ): Promise<RoomResponseDto[]> {
    return this.roomService.findAll(user.center_id, query);
  }

  @Get('available')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_ROOMS)
  findAvailable(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CheckRoomBookingDto,
  ): Promise<RoomResponseDto[]> {
    return this.roomService.findAvailable(user.center_id, query);
  }

  @Get('status')
  getStatus(): RoomStatusResponseDto {
    return this.roomService.getStatus();
  }

  @Get(':id/is-booked')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_ROOMS)
  isBookedAt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CheckRoomBookingDto,
  ): Promise<RoomBookingResponseDto> {
    return this.roomService.isBookedAt(user.center_id, id, query);
  }

  @Get(':id/schedule')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_ROOMS)
  findSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoomScheduleResponseDto> {
    return this.roomService.findSchedule(user.center_id, id);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_ROOMS)
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoomDetailResponseDto> {
    return this.roomService.findOne(user.center_id, id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_ROOMS)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateRoomDto,
  ): Promise<RoomDetailResponseDto> {
    return this.roomService.update(user.center_id, id, payload);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_ROOMS)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.roomService.remove(user.center_id, id);
  }
}
