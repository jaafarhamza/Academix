import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateTeacherSubjectDto } from '../dto/create-teacher-subject.dto';
import { QueryTeacherSubjectDto } from '../dto/query-teacher-subject.dto';
import { TeacherSubjectResponseDto } from '../dto/teacher-subject-response.dto';
import { TeacherSubjectStatusResponseDto } from '../dto/teacher-subject-status-response.dto';

@Injectable()
export class TeacherSubjectService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(
    centerId: string,
    query: QueryTeacherSubjectDto,
  ): Promise<TeacherSubjectResponseDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const assignments = await this.prismaService.teacherSubject.findMany({
      where: {
        teacher: {
          centerId,
          role: UserRole.TEACHER,
        },
        subject: {
          centerId,
        },
        ...(query.teacherId ? { teacherId: query.teacherId } : {}),
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      },
      orderBy: [{ id: 'asc' }],
      skip,
      take: limit,
      select: this.getTeacherSubjectSelect(),
    });

    return assignments.map((assignment) =>
      this.toTeacherSubjectResponse(assignment),
    );
  }

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
        select: this.getTeacherSubjectSelect(),
      });

      return this.toTeacherSubjectResponse(assignment);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Teacher is already assigned to this subject',
        );
      }

      throw error;
    }
  }

  async remove(centerId: string, id: string): Promise<void> {
    const assignment = await this.prismaService.teacherSubject.findFirst({
      where: {
        id,
        teacher: {
          centerId,
          role: UserRole.TEACHER,
        },
        subject: {
          centerId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Teacher-subject assignment not found');
    }

    try {
      await this.prismaService.teacherSubject.delete({
        where: {
          id: assignment.id,
        },
      });
    } catch (error: unknown) {
      if (this.isForeignKeyConstraintError(error)) {
        throw new ConflictException(
          'Cannot delete teacher-subject assignment because it is linked to other records',
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

  private isForeignKeyConstraintError(error: unknown): error is {
    code: 'P2003';
    meta?: { field_name?: unknown };
  } {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const record = error as { code?: unknown };
    return record.code === 'P2003';
  }

  private getTeacherSubjectSelect() {
    return {
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
    };
  }

  private toTeacherSubjectResponse(assignment: {
    id: string;
    teacherId: string;
    subjectId: string;
    teacher: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    subject: {
      id: string;
      name: string;
    };
  }): TeacherSubjectResponseDto {
    return {
      id: assignment.id,
      teacher_id: assignment.teacherId,
      subject_id: assignment.subjectId,
      teacher: assignment.teacher,
      subject: assignment.subject,
    };
  }
}
