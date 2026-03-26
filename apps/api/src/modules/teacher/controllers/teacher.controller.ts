import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserJwtAuthGuard } from '../../auth/guards/user-jwt-auth.guard';
import { TeacherStatusResponseDto } from '../dto/teacher-status-response.dto';
import { TeacherService } from '../services/teacher.service';

@Controller('teachers')
@UseGuards(UserJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('status')
  getStatus(): TeacherStatusResponseDto {
    return this.teacherService.getStatus();
  }
}
