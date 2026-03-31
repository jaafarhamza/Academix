import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateStudentGroupDto } from '../dto/create-student-group.dto';
import { QueryStudentGroupDto } from '../dto/query-student-group.dto';
import { StudentGroupResponseDto } from '../dto/student-group-response.dto';
import { StudentGroupStatusResponseDto } from '../dto/student-group-status-response.dto';
import {
  buildStudentGroupBaseName,
  buildStudentGroupNameCandidate,
} from '../utils/student-group-name.util';

const MAX_AUTO_NAME_ATTEMPTS = 50;

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
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!teacherSubject) {
      throw new NotFoundException('Teacher-subject assignment not found');
    }

    if (payload.name) {
      try {
        const studentGroup = await this.createStudentGroup(
          centerId,
          teacherSubject.id,
          payload.schoolCycle,
          payload.schoolYear,
          payload.name,
        );

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

    const autoBaseName = buildStudentGroupBaseName(
      teacherSubject.teacher.firstName,
      teacherSubject.teacher.lastName,
      teacherSubject.subject.name,
    );

    for (let attempt = 0; attempt < MAX_AUTO_NAME_ATTEMPTS; attempt += 1) {
      const candidateName = buildStudentGroupNameCandidate(
        autoBaseName,
        attempt,
      );
      try {
        const studentGroup = await this.createStudentGroup(
          centerId,
          teacherSubject.id,
          payload.schoolCycle,
          payload.schoolYear,
          candidateName,
        );

        return this.toStudentGroupResponse(studentGroup);
      } catch (error: unknown) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    throw new ConflictException(
      'Unable to auto-generate a unique student group name',
    );
  }

  async findAll(
    centerId: string,
    query: QueryStudentGroupDto,
  ): Promise<StudentGroupResponseDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const teacherSubjectFilters = {
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    };

    const studentGroups = await this.prismaService.studentGroup.findMany({
      where: {
        centerId,
        ...(query.schoolCycle ? { schoolCycle: query.schoolCycle } : {}),
        ...(query.schoolYear ? { schoolYear: query.schoolYear } : {}),
        ...(Object.keys(teacherSubjectFilters).length > 0
          ? { teacherSubject: teacherSubjectFilters }
          : {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip,
      take: limit,
      select: this.getStudentGroupSelect(),
    });

    return studentGroups.map((studentGroup) =>
      this.toStudentGroupResponse(studentGroup),
    );
  }

  private async createStudentGroup(
    centerId: string,
    teacherSubjectId: string,
    schoolCycle: CreateStudentGroupDto['schoolCycle'],
    schoolYear: CreateStudentGroupDto['schoolYear'],
    name: string,
  ) {
    return this.prismaService.studentGroup.create({
      data: {
        centerId,
        teacherSubjectId,
        name,
        schoolCycle,
        schoolYear,
      },
      select: this.getStudentGroupSelect(),
    });
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
