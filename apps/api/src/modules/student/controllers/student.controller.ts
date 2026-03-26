import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserJwtAuthGuard } from '../../auth/guards/user-jwt-auth.guard';
import { StudentStatusResponseDto } from '../dto/student-status-response.dto';
import { StudentService } from '../services/student.service';

@Controller('students')
@UseGuards(UserJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('status')
  getStatus(): StudentStatusResponseDto {
    return this.studentService.getStatus();
  }
}
