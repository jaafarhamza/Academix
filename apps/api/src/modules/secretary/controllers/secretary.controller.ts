import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserJwtAuthGuard } from '../../auth/guards/user-jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateSecretaryDto } from '../dto/create-secretary.dto';
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

  @Get('status')
  getStatus(): SecretaryStatusResponseDto {
    return this.secretaryService.getStatus();
  }
}
