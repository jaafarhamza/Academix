import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { CreateTeacherSubjectDto } from '../dto/create-teacher-subject.dto';
import { QueryTeacherSubjectDto } from '../dto/query-teacher-subject.dto';
import { TeacherSubjectStatusResponseDto } from '../dto/teacher-subject-status-response.dto';
import { TeacherSubjectResponseDto } from '../dto/teacher-subject-response.dto';
import { TeacherSubjectService } from '../services/teacher-subject.service';

@Controller('teacher-subjects')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class TeacherSubjectController {
  constructor(private readonly teacherSubjectService: TeacherSubjectService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SUBJECTS)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateTeacherSubjectDto,
  ): Promise<TeacherSubjectResponseDto> {
    return this.teacherSubjectService.create(user.center_id, payload);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SUBJECTS)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTeacherSubjectDto,
  ): Promise<TeacherSubjectResponseDto[]> {
    return this.teacherSubjectService.findAll(user.center_id, query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SUBJECTS)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.teacherSubjectService.remove(user.center_id, id);
  }

  @Get('status')
  getStatus(): TeacherSubjectStatusResponseDto {
    return this.teacherSubjectService.getStatus();
  }
}
