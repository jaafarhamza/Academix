import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateStudentGroupDto } from '../dto/create-student-group.dto';
import { StudentGroupResponseDto } from '../dto/student-group-response.dto';
import { StudentGroupStatusResponseDto } from '../dto/student-group-status-response.dto';

@Injectable()
export class StudentGroupService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    centerId: string,
    payload: CreateStudentGroupDto,
  ): Promise<StudentGroupResponseDto> {
    const teacherSubject = await this.prismaService.teacherSubject.findFirst({
      where: {
        id: payload.teacherSubjectId,
        teacher: {
          centerId,
          role: UserRole.TEACHER,
          isActive: true,
        },
        subject: {
          centerId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!teacherSubject) {
      throw new NotFoundException('Teacher-subject assignment not found');
    }

    try {
      const studentGroup = await this.prismaService.studentGroup.create({
        data: {
          centerId,
          teacherSubjectId: teacherSubject.id,
          name: payload.name,
          schoolCycle: payload.schoolCycle,
          schoolYear: payload.schoolYear,
        },
        select: this.getStudentGroupSelect(),
      });

      return this.toStudentGroupResponse(studentGroup);
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      throw new ConflictException(
        'Student group name already in use for this cycle and year',
      );
    }
  }

  getStatus(): StudentGroupStatusResponseDto {
    return {
      module: 'student-group',
      status: 'ready',
    };
  }

  private getStudentGroupSelect() {
    return {
      id: true,
      centerId: true,
      teacherSubjectId: true,
      name: true,
      schoolCycle: true,
      schoolYear: true,
    };
  }

  private toStudentGroupResponse(studentGroup: {
    id: string;
    centerId: string;
    teacherSubjectId: string;
    name: string;
    schoolCycle: StudentGroupResponseDto['schoolCycle'];
    schoolYear: StudentGroupResponseDto['schoolYear'];
  }): StudentGroupResponseDto {
    return {
      id: studentGroup.id,
      center_id: studentGroup.centerId,
      teacher_subject_id: studentGroup.teacherSubjectId,
      name: studentGroup.name,
      schoolCycle: studentGroup.schoolCycle,
      schoolYear: studentGroup.schoolYear,
    };
  }

  private isUniqueConstraintError(error: unknown): error is {
    code: 'P2002';
    meta?: { target?: unknown };
  } {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const record = error as { code?: unknown };
    return record.code === 'P2002';
  }
}
