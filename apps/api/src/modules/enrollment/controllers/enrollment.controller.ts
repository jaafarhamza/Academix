import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { EnrollmentStatusResponseDto } from '../dto/enrollment-status-response.dto';
import { EnrollmentService } from '../services/enrollment.service';

@Controller('enrollments')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('status')
  getStatus(): EnrollmentStatusResponseDto {
    return this.enrollmentService.getStatus();
  }
}
