import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { StudentGroupStatusResponseDto } from '../dto/student-group-status-response.dto';
import { StudentGroupService } from '../services/student-group.service';

@Controller('student-groups')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class StudentGroupController {
  constructor(private readonly studentGroupService: StudentGroupService) {}

  @Get('status')
  getStatus(): StudentGroupStatusResponseDto {
    return this.studentGroupService.getStatus();
  }
}
