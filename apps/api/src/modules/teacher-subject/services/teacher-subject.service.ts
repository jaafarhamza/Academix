import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateTeacherSubjectDto } from '../dto/create-teacher-subject.dto';
import { TeacherSubjectResponseDto } from '../dto/teacher-subject-response.dto';
import { TeacherSubjectStatusResponseDto } from '../dto/teacher-subject-status-response.dto';

@Injectable()
export class TeacherSubjectService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    centerId: string,
    payload: CreateTeacherSubjectDto,
  ): Promise<TeacherSubjectResponseDto> {
    const teacher = await this.prismaService.user.findFirst({
      where: {
        id: payload.teacherId,
        centerId,
        role: UserRole.TEACHER,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const subject = await this.prismaService.subject.findFirst({
      where: {
        id: payload.subjectId,
        centerId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    try {
      const assignment = await this.prismaService.teacherSubject.create({
        data: {
          teacherId: teacher.id,
          subjectId: subject.id,
        },
        select: {
          id: true,
          teacherId: true,
          subjectId: true,
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        id: assignment.id,
        teacher_id: assignment.teacherId,
        subject_id: assignment.subjectId,
        teacher: assignment.teacher,
        subject: assignment.subject,
      };
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Teacher is already assigned to this subject',
        );
      }

      throw error;
    }
  }

  getStatus(): TeacherSubjectStatusResponseDto {
    return {
      module: 'teacher-subject',
      status: 'ready',
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
