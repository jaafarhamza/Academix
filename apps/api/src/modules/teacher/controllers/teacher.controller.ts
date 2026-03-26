import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UserJwtAuthGuard } from '../../auth/guards/user-jwt-auth.guard';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { TeacherStatusResponseDto } from '../dto/teacher-status-response.dto';
import { TeacherResponseDto } from '../dto/teacher-response.dto';
import { TeacherService } from '../services/teacher.service';

@Controller('teachers')
@UseGuards(UserJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post()
  @RequirePermission(PermissionAction.MANAGE_USERS)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateTeacherDto,
  ): Promise<TeacherResponseDto> {
    return this.teacherService.create(user.center_id, payload);
  }

  @Get('status')
  getStatus(): TeacherStatusResponseDto {
    return this.teacherService.getStatus();
  }
}
