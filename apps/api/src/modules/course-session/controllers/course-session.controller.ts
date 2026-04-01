import {
  Body,
  Controller,
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
import { CourseSessionResponseDto } from '../dto/course-session-response.dto';
import { CourseSessionStatusResponseDto } from '../dto/course-session-status-response.dto';
import { CreateSessionDto } from '../dto/create-session.dto';
import { QuerySessionDto } from '../dto/query-session.dto';
import { RescheduleSessionDto } from '../dto/reschedule-session.dto';
import { CourseSessionService } from '../services/course-session.service';

@Controller('sessions')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class CourseSessionController {
  constructor(private readonly courseSessionService: CourseSessionService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SCHEDULE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateSessionDto,
  ): Promise<CourseSessionResponseDto> {
    return this.courseSessionService.create(user.center_id, payload);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SCHEDULE)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QuerySessionDto,
  ): Promise<CourseSessionResponseDto[]> {
    return this.courseSessionService.findAll(user.center_id, query);
  }

  @Get('teacher/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SCHEDULE)
  findTeacherWeeklySchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) teacherId: string,
  ): Promise<CourseSessionResponseDto[]> {
    return this.courseSessionService.findTeacherWeeklySchedule(
      user.center_id,
      teacherId,
    );
  }

  @Get('student/:id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SCHEDULE)
  findStudentSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) studentId: string,
  ): Promise<CourseSessionResponseDto[]> {
    return this.courseSessionService.findStudentSchedule(
      user.center_id,
      studentId,
    );
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SCHEDULE)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.courseSessionService.cancel(user.center_id, id);
  }

  @Patch(':id/reschedule')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SCHEDULE)
  reschedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: RescheduleSessionDto,
  ): Promise<CourseSessionResponseDto> {
    return this.courseSessionService.reschedule(user.center_id, id, payload);
  }

  @Get('status')
  getStatus(): CourseSessionStatusResponseDto {
    return this.courseSessionService.getStatus();
  }
}
