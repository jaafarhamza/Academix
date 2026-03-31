import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateEnrollmentDto } from '../dto/create-enrollment.dto';
import { EnrollmentResponseDto } from '../dto/enrollment-response.dto';
import { EnrollmentStatusResponseDto } from '../dto/enrollment-status-response.dto';
import { QueryEnrollmentDto } from '../dto/query-enrollment.dto';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(
    centerId: string,
    query: QueryEnrollmentDto,
  ): Promise<EnrollmentResponseDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const enrollments = await this.prismaService.enrollment.findMany({
      where: {
        student: {
          centerId,
          role: UserRole.STUDENT,
        },
        studentGroup: {
          centerId,
        },
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(query.studentGroupId
          ? { studentGroupId: query.studentGroupId }
          : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      },
      orderBy: [{ enrollmentDate: 'desc' }, { id: 'asc' }],
      skip,
      take: limit,
      select: this.getEnrollmentSelect(),
    });

    return enrollments.map((enrollment) =>
      this.toEnrollmentResponse(enrollment),
    );
  }

  async create(
    centerId: string,
    payload: CreateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    const student = await this.prismaService.user.findFirst({
      where: {
        id: payload.studentId,
        centerId,
        role: UserRole.STUDENT,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const studentGroup = await this.prismaService.studentGroup.findFirst({
      where: {
        id: payload.studentGroupId,
        centerId,
      },
      select: {
        id: true,
      },
    });

    if (!studentGroup) {
      throw new NotFoundException('Student group not found');
    }

    const enrollmentDate = this.resolveEnrollmentDate(payload.enrollmentDate);
    const existingEnrollment = await this.prismaService.enrollment.findUnique({
      where: {
        studentId_studentGroupId: {
          studentId: student.id,
          studentGroupId: studentGroup.id,
        },
      },
      select: this.getEnrollmentSelect(),
    });

    if (existingEnrollment) {
      if (existingEnrollment.isActive) {
        throw new ConflictException(
          'Student is already actively enrolled in this group',
        );
      }

      const reactivatedEnrollment = await this.prismaService.enrollment.update({
        where: {
          id: existingEnrollment.id,
        },
        data: {
          isActive: true,
          enrollmentDate,
        },
        select: this.getEnrollmentSelect(),
      });

      return this.toEnrollmentResponse(reactivatedEnrollment);
    }

    try {
      const enrollment = await this.prismaService.enrollment.create({
        data: {
          studentId: student.id,
          studentGroupId: studentGroup.id,
          enrollmentDate,
          isActive: true,
        },
        select: this.getEnrollmentSelect(),
      });

      return this.toEnrollmentResponse(enrollment);
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      throw new ConflictException(
        'Student is already actively enrolled in this group',
      );
    }
  }

  async deactivate(centerId: string, id: string): Promise<void> {
    const enrollment = await this.findEnrollmentStateOrThrow(centerId, id);

    if (!enrollment.isActive) {
      return;
    }

    await this.prismaService.enrollment.update({
      where: {
        id: enrollment.id,
      },
      data: {
        isActive: false,
      },
      select: {
        id: true,
      },
    });
  }

  getStatus(): EnrollmentStatusResponseDto {
    return {
      module: 'enrollment',
      status: 'ready',
    };
  }

  private async findEnrollmentStateOrThrow(centerId: string, id: string) {
    const enrollment = await this.prismaService.enrollment.findFirst({
      where: {
        id,
        student: {
          centerId,
          role: UserRole.STUDENT,
        },
        studentGroup: {
          centerId,
        },
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return enrollment;
  }

  private resolveEnrollmentDate(value?: string): Date {
    if (!value) {
      return new Date();
    }

    return new Date(value);
  }

  private getEnrollmentSelect() {
    return {
      id: true,
      studentId: true,
      studentGroupId: true,
      enrollmentDate: true,
      isActive: true,
    };
  }

  private toEnrollmentResponse(enrollment: {
    id: string;
    studentId: string;
    studentGroupId: string;
    enrollmentDate: Date;
    isActive: boolean;
  }): EnrollmentResponseDto {
    return {
      id: enrollment.id,
      student_id: enrollment.studentId,
      student_group_id: enrollment.studentGroupId,
      enrollmentDate: enrollment.enrollmentDate.toISOString(),
      isActive: enrollment.isActive,
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
