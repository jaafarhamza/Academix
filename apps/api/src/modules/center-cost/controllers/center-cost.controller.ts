import {
  Body,
  Controller,
  Get,
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
import { CreateCenterCostDto } from '../dto/create-center-cost.dto';
import { CenterCostResponseDto } from '../dto/center-cost-response.dto';
import { CenterCostStatusResponseDto } from '../dto/center-cost-status-response.dto';
import { QueryCenterCostDto } from '../dto/query-center-cost.dto';
import { UpdateCenterCostDto } from '../dto/update-center-cost.dto';
import { CenterCostService } from '../services/center-cost.service';

@Controller('center-costs')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class CenterCostController {
  constructor(private readonly centerCostService: CenterCostService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_COSTS)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateCenterCostDto,
  ): Promise<CenterCostResponseDto> {
    return this.centerCostService.create(user.center_id, payload);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_COSTS)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryCenterCostDto,
  ): Promise<CenterCostResponseDto[]> {
    return this.centerCostService.findAll(user.center_id, query);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_COSTS)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateCenterCostDto,
  ): Promise<CenterCostResponseDto> {
    return this.centerCostService.update(user.center_id, id, payload);
  }

  @Get('status')
  getStatus(): CenterCostStatusResponseDto {
    return this.centerCostService.getStatus();
  }
}
