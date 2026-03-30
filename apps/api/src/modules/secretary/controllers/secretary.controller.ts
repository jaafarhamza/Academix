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
import { CreateSecretaryDto } from '../dto/create-secretary.dto';
import { QuerySecretaryDto } from '../dto/query-secretary.dto';
import { SecretaryDetailResponseDto } from '../dto/secretary-detail-response.dto';
import { SecretaryResponseDto } from '../dto/secretary-response.dto';
import { SecretaryStatusResponseDto } from '../dto/secretary-status-response.dto';
import { UpdateSecretaryDto } from '../dto/update-secretary.dto';
import { SecretaryService } from '../services/secretary.service';

@Controller('secretaries')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SecretaryController {
  constructor(private readonly secretaryService: SecretaryService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_USERS)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateSecretaryDto,
  ): Promise<SecretaryResponseDto> {
    return this.secretaryService.create(user.center_id, payload);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_USERS)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QuerySecretaryDto,
  ): Promise<SecretaryResponseDto[]> {
    return this.secretaryService.findAll(user.center_id, query);
  }

  @Get('status')
  getStatus(): SecretaryStatusResponseDto {
    return this.secretaryService.getStatus();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_USERS)
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SecretaryDetailResponseDto> {
    return this.secretaryService.findOne(user.center_id, id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_USERS)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateSecretaryDto,
  ): Promise<SecretaryDetailResponseDto> {
    return this.secretaryService.update(user.center_id, id, payload);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_USERS)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.secretaryService.deactivate(user.center_id, id);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_USERS)
  async activate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.secretaryService.activate(user.center_id, id);
  }
}
