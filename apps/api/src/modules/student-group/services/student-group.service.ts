import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateStudentGroupDto } from '../dto/create-student-group.dto';
import { QueryStudentGroupDto } from '../dto/query-student-group.dto';
import { StudentGroupDetailResponseDto } from '../dto/student-group-detail-response.dto';
import { StudentGroupResponseDto } from '../dto/student-group-response.dto';
import { StudentGroupStatusResponseDto } from '../dto/student-group-status-response.dto';
import { UpdateStudentGroupDto } from '../dto/update-student-group.dto';
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
    const teacherSubject = await this.findTeacherSubjectOrThrow(
      centerId,
      payload.teacherSubjectId,
    );

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

  async findOne(
    centerId: string,
    id: string,
  ): Promise<StudentGroupDetailResponseDto> {
    const studentGroup = await this.findStudentGroupDetailOrThrow(centerId, id);
    return this.toStudentGroupDetailResponse(studentGroup);
  }

  async update(
    centerId: string,
    id: string,
    payload: UpdateStudentGroupDto,
  ): Promise<StudentGroupDetailResponseDto> {
    const existingStudentGroup = await this.findStudentGroupDetailOrThrow(
      centerId,
      id,
    );
    const data = await this.buildStudentGroupUpdateData(centerId, payload);

    if (Object.keys(data).length === 0) {
      return this.toStudentGroupDetailResponse(existingStudentGroup);
    }

    try {
      await this.prismaService.studentGroup.update({
        where: {
          id,
        },
        data,
        select: {
          id: true,
        },
      });

      const studentGroup = await this.findStudentGroupDetailOrThrow(
        centerId,
        id,
      );
      return this.toStudentGroupDetailResponse(studentGroup);
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      throw new ConflictException(
        'Student group name already in use for this cycle and year',
      );
    }
  }

  async remove(centerId: string, id: string): Promise<void> {
    await this.findStudentGroupStateOrThrow(centerId, id);

    try {
      await this.prismaService.studentGroup.delete({
        where: {
          id,
        },
      });
    } catch (error: unknown) {
      if (this.isForeignKeyConstraintError(error)) {
        throw new ConflictException(
          'Cannot delete student group because it is linked to other records',
        );
      }

      throw error;
    }
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

  private async findTeacherSubjectOrThrow(centerId: string, id: string) {
    const teacherSubject = await this.prismaService.teacherSubject.findFirst({
      where: {
        id,
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

    return teacherSubject;
  }

  private async findStudentGroupDetailOrThrow(centerId: string, id: string) {
    const studentGroup = await this.prismaService.studentGroup.findFirst({
      where: {
        id,
        centerId,
      },
      select: this.getStudentGroupDetailSelect(),
    });

    if (!studentGroup) {
      throw new NotFoundException('Student group not found');
    }

    return studentGroup;
  }

  private async findStudentGroupStateOrThrow(centerId: string, id: string) {
    const studentGroup = await this.prismaService.studentGroup.findFirst({
      where: {
        id,
        centerId,
      },
      select: {
        id: true,
      },
    });

    if (!studentGroup) {
      throw new NotFoundException('Student group not found');
    }

    return studentGroup;
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

  private getStudentGroupDetailSelect() {
    return {
      ...this.getStudentGroupSelect(),
      teacherSubject: {
        select: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      enrollments: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
        },
      },
    };
  }

  private async buildStudentGroupUpdateData(
    centerId: string,
    payload: UpdateStudentGroupDto,
  ): Promise<Prisma.StudentGroupUpdateInput> {
    const data: Prisma.StudentGroupUpdateInput = {};

    if (payload.teacherSubjectId !== undefined) {
      const teacherSubject = await this.findTeacherSubjectOrThrow(
        centerId,
        payload.teacherSubjectId,
      );
      data.teacherSubject = {
        connect: {
          id: teacherSubject.id,
        },
      };
    }
    if (payload.name !== undefined) {
      data.name = payload.name;
    }
    if (payload.schoolCycle !== undefined) {
      data.schoolCycle = payload.schoolCycle;
    }
    if (payload.schoolYear !== undefined) {
      data.schoolYear = payload.schoolYear;
    }

    return data;
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

  private toStudentGroupDetailResponse(studentGroup: {
    id: string;
    centerId: string;
    teacherSubjectId: string;
    name: string;
    schoolCycle: StudentGroupDetailResponseDto['schoolCycle'];
    schoolYear: StudentGroupDetailResponseDto['schoolYear'];
    teacherSubject: {
      teacher: {
        id: string;
        firstName: string;
        lastName: string;
      };
      subject: {
        id: string;
        name: string;
      };
    };
    enrollments: {
      id: string;
    }[];
  }): StudentGroupDetailResponseDto {
    return {
      id: studentGroup.id,
      center_id: studentGroup.centerId,
      teacher_subject_id: studentGroup.teacherSubjectId,
      name: studentGroup.name,
      schoolCycle: studentGroup.schoolCycle,
      schoolYear: studentGroup.schoolYear,
      teacherId: studentGroup.teacherSubject.teacher.id,
      teacherName: `${studentGroup.teacherSubject.teacher.firstName} ${studentGroup.teacherSubject.teacher.lastName}`,
      subjectId: studentGroup.teacherSubject.subject.id,
      subjectName: studentGroup.teacherSubject.subject.name,
      studentNumbers: studentGroup.enrollments.length,
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
}
