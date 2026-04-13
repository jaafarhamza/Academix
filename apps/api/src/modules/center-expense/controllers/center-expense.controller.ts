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
import { CreateCenterExpenseDto } from '../dto/create-center-expense.dto';
import { CenterExpenseResponseDto } from '../dto/center-expense-response.dto';
import { CenterExpenseStatusResponseDto } from '../dto/center-expense-status-response.dto';
import { QueryCenterExpenseDto } from '../dto/query-center-expense.dto';
import { UpdateCenterExpenseDto } from '../dto/update-center-expense.dto';
import { CenterExpenseService } from '../services/center-expense.service';

@Controller('center-expenses')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class CenterExpenseController {
  constructor(private readonly centerExpenseService: CenterExpenseService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_EXPENSES)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateCenterExpenseDto,
  ): Promise<CenterExpenseResponseDto> {
    return this.centerExpenseService.create(user.center_id, payload);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_EXPENSES)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryCenterExpenseDto,
  ): Promise<CenterExpenseResponseDto[]> {
    return this.centerExpenseService.findAll(user.center_id, query);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_EXPENSES)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateCenterExpenseDto,
  ): Promise<CenterExpenseResponseDto> {
    return this.centerExpenseService.update(user.center_id, id, payload);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_EXPENSES)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.centerExpenseService.remove(user.center_id, id);
  }

  @Get('status')
  getStatus(): CenterExpenseStatusResponseDto {
    return this.centerExpenseService.getStatus();
  }
}
