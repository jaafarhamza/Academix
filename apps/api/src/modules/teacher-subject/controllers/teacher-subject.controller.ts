import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { TeacherSubjectStatusResponseDto } from '../dto/teacher-subject-status-response.dto';
import { TeacherSubjectService } from '../services/teacher-subject.service';

@Controller('teacher-subjects')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class TeacherSubjectController {
  constructor(private readonly teacherSubjectService: TeacherSubjectService) {}

  @Get('status')
  getStatus(): TeacherSubjectStatusResponseDto {
    return this.teacherSubjectService.getStatus();
  }
}
