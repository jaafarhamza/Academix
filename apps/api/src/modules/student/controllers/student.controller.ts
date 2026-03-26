import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserJwtAuthGuard } from '../../auth/guards/user-jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateStudentDto } from '../dto/create-student.dto';
import { StudentDetailResponseDto } from '../dto/student-detail-response.dto';
import { QueryStudentDto } from '../dto/query-student.dto';
import { StudentStatusResponseDto } from '../dto/student-status-response.dto';
import { StudentResponseDto } from '../dto/student-response.dto';
import { StudentService } from '../services/student.service';

@Controller('students')
@UseGuards(UserJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @RequirePermission(PermissionAction.MANAGE_USERS)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateStudentDto,
  ): Promise<StudentResponseDto> {
    return this.studentService.create(user.center_id, payload);
  }

  @Get()
  @RequirePermission(PermissionAction.MANAGE_USERS)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryStudentDto,
  ): Promise<StudentResponseDto[]> {
    return this.studentService.findAll(user.center_id, query);
  }

  @Get('status')
  getStatus(): StudentStatusResponseDto {
    return this.studentService.getStatus();
  }

  @Get(':id')
  @RequirePermission(PermissionAction.MANAGE_USERS)
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StudentDetailResponseDto> {
    return this.studentService.findOne(user.center_id, id);
  }
}
