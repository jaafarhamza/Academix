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
import { CreateEnrollmentDto } from '../dto/create-enrollment.dto';
import { QueryEnrollmentDto } from '../dto/query-enrollment.dto';
import { EnrollmentResponseDto } from '../dto/enrollment-response.dto';
import { EnrollmentStatusResponseDto } from '../dto/enrollment-status-response.dto';
import { EnrollmentService } from '../services/enrollment.service';

@Controller('enrollments')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_GROUPS)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    return this.enrollmentService.create(user.center_id, payload);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_GROUPS)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryEnrollmentDto,
  ): Promise<EnrollmentResponseDto[]> {
    return this.enrollmentService.findAll(user.center_id, query);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_GROUPS)
  async deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.enrollmentService.deactivate(user.center_id, id);
  }

  @Get('status')
  getStatus(): EnrollmentStatusResponseDto {
    return this.enrollmentService.getStatus();
  }
}
