import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CenterExpenseStatusResponseDto } from '../dto/center-expense-status-response.dto';
import { CenterExpenseService } from '../services/center-expense.service';

@Controller('center-expenses')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class CenterExpenseController {
  constructor(private readonly centerExpenseService: CenterExpenseService) {}

  @Get('status')
  getStatus(): CenterExpenseStatusResponseDto {
    return this.centerExpenseService.getStatus();
  }
}
