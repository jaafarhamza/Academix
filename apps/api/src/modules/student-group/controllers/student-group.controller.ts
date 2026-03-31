import {
  Body,
  Controller,
  Get,
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
import { CreateStudentGroupDto } from '../dto/create-student-group.dto';
import { QueryStudentGroupDto } from '../dto/query-student-group.dto';
import { StudentGroupDetailResponseDto } from '../dto/student-group-detail-response.dto';
import { StudentGroupResponseDto } from '../dto/student-group-response.dto';
import { StudentGroupStatusResponseDto } from '../dto/student-group-status-response.dto';
import { StudentGroupService } from '../services/student-group.service';

@Controller('student-groups')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class StudentGroupController {
  constructor(private readonly studentGroupService: StudentGroupService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_GROUPS)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateStudentGroupDto,
  ): Promise<StudentGroupResponseDto> {
    return this.studentGroupService.create(user.center_id, payload);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_GROUPS)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryStudentGroupDto,
  ): Promise<StudentGroupResponseDto[]> {
    return this.studentGroupService.findAll(user.center_id, query);
  }

  @Get('status')
  getStatus(): StudentGroupStatusResponseDto {
    return this.studentGroupService.getStatus();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_GROUPS)
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StudentGroupDetailResponseDto> {
    return this.studentGroupService.findOne(user.center_id, id);
  }
}
