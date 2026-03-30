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
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { QuerySubjectDto } from '../dto/query-subject.dto';
import { SubjectDetailResponseDto } from '../dto/subject-detail-response.dto';
import { SubjectResponseDto } from '../dto/subject-response.dto';
import { SubjectStatusResponseDto } from '../dto/subject-status-response.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import { SubjectService } from '../services/subject.service';

@Controller('subjects')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SUBJECTS)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateSubjectDto,
  ): Promise<SubjectResponseDto> {
    return this.subjectService.create(user.center_id, payload);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SUBJECTS)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QuerySubjectDto,
  ): Promise<SubjectResponseDto[]> {
    return this.subjectService.findAll(user.center_id, query);
  }

  @Get('status')
  getStatus(): SubjectStatusResponseDto {
    return this.subjectService.getStatus();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SUBJECTS)
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubjectDetailResponseDto> {
    return this.subjectService.findOne(user.center_id, id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SUBJECTS)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateSubjectDto,
  ): Promise<SubjectDetailResponseDto> {
    return this.subjectService.update(user.center_id, id, payload);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_SUBJECTS)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.subjectService.remove(user.center_id, id);
  }
}
