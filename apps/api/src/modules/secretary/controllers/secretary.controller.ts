import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserJwtAuthGuard } from '../../auth/guards/user-jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateSecretaryDto } from '../dto/create-secretary.dto';
import { QuerySecretaryDto } from '../dto/query-secretary.dto';
import { SecretaryDetailResponseDto } from '../dto/secretary-detail-response.dto';
import { SecretaryResponseDto } from '../dto/secretary-response.dto';
import { SecretaryStatusResponseDto } from '../dto/secretary-status-response.dto';
import { SecretaryService } from '../services/secretary.service';

@Controller('secretaries')
@UseGuards(UserJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SecretaryController {
  constructor(private readonly secretaryService: SecretaryService) {}

  @Post()
  @RequirePermission(PermissionAction.MANAGE_USERS)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateSecretaryDto,
  ): Promise<SecretaryResponseDto> {
    return this.secretaryService.create(user.center_id, payload);
  }

  @Get()
  @RequirePermission(PermissionAction.MANAGE_USERS)
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
  @RequirePermission(PermissionAction.MANAGE_USERS)
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SecretaryDetailResponseDto> {
    return this.secretaryService.findOne(user.center_id, id);
  }
}
