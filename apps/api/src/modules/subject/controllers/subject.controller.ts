import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SubjectStatusResponseDto } from '../dto/subject-status-response.dto';
import { SubjectService } from '../services/subject.service';

@Controller('subjects')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Get('status')
  getStatus(): SubjectStatusResponseDto {
    return this.subjectService.getStatus();
  }
}
