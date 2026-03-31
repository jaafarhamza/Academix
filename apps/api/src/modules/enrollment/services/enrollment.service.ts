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

@Injectable()
export class EnrollmentService {
  constructor(private readonly prismaService: PrismaService) {}

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
          'Student is already enrolled in this group',
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

      throw new ConflictException('Student is already enrolled in this group');
    }
  }

  getStatus(): EnrollmentStatusResponseDto {
    return {
      module: 'enrollment',
      status: 'ready',
    };
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
