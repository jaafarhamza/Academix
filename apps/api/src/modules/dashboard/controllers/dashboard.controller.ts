import { Controller, Get, Query, SetMetadata, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { USER_PERMISSION_KEY } from '../../auth/constants/user-auth.constants';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { FinancialDashboardResponseDto } from '../dto/financial-dashboard-response.dto';
import { QueryFinancialDashboardDto } from '../dto/query-financial-dashboard.dto';
import { DashboardService } from '../services/dashboard.service';

@Controller('dashboard')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('financial')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.VIEW_REPORTS)
  getFinancial(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryFinancialDashboardDto,
  ): Promise<FinancialDashboardResponseDto> {
    return this.dashboardService.getFinancial(user.center_id, query);
  }
}
