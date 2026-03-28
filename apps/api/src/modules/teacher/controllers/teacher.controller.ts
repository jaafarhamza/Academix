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
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { QueryTeacherDto } from '../dto/query-teacher.dto';
import { TeacherDetailResponseDto } from '../dto/teacher-detail-response.dto';
import { TeacherStatusResponseDto } from '../dto/teacher-status-response.dto';
import { TeacherResponseDto } from '../dto/teacher-response.dto';
import { UpdateTeacherDto } from '../dto/update-teacher.dto';
import { TeacherService } from '../services/teacher.service';

@Controller('teachers')
@SkipThrottle({ auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_USERS)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateTeacherDto,
  ): Promise<TeacherResponseDto> {
    return this.teacherService.create(user.center_id, payload);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_USERS)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTeacherDto,
  ): Promise<TeacherResponseDto[]> {
    return this.teacherService.findAll(user.center_id, query);
  }

  @Get('status')
  getStatus(): TeacherStatusResponseDto {
    return this.teacherService.getStatus();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_USERS)
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TeacherDetailResponseDto> {
    return this.teacherService.findOne(user.center_id, id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_USERS)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateTeacherDto,
  ): Promise<TeacherDetailResponseDto> {
    return this.teacherService.update(user.center_id, id, payload);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_USERS)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.teacherService.deactivate(user.center_id, id);
  }
}
