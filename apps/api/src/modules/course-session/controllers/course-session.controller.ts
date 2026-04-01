import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CourseSessionStatusResponseDto } from '../dto/course-session-status-response.dto';
import { CourseSessionService } from '../services/course-session.service';

@Controller('sessions')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class CourseSessionController {
  constructor(private readonly courseSessionService: CourseSessionService) {}

  @Get('status')
  getStatus(): CourseSessionStatusResponseDto {
    return this.courseSessionService.getStatus();
  }
}
