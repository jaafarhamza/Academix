import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CenterCostStatusResponseDto } from '../dto/center-cost-status-response.dto';
import { CenterCostService } from '../services/center-cost.service';

@Controller('center-costs')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class CenterCostController {
  constructor(private readonly centerCostService: CenterCostService) {}

  @Get('status')
  getStatus(): CenterCostStatusResponseDto {
    return this.centerCostService.getStatus();
  }
}
