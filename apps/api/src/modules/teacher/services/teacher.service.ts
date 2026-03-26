import { ConflictException, Injectable } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { hashPassword } from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { TeacherStatusResponseDto } from '../dto/teacher-status-response.dto';
import { TeacherResponseDto } from '../dto/teacher-response.dto';

@Injectable()
export class TeacherService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    centerId: string,
    payload: CreateTeacherDto,
  ): Promise<TeacherResponseDto> {
    const passwordHash = await hashPassword(payload.password);
    try {
      const teacher = await this.prismaService.user.create({
        data: {
          centerId,
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          passwordHash,
          phone: payload.phone,
          role: UserRole.TEACHER,
          cin: payload.cin,
          hourlyRate: payload.hourlyRate ?? null,
          maxHoursPerWeek: payload.maxHoursPerWeek ?? null,
        },
        select: {
          id: true,
          centerId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          cin: true,
          isActive: true,
          createdAt: true,
        },
      });

      return {
        id: teacher.id,
        center_id: teacher.centerId,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        phone: teacher.phone,
        role: teacher.role,
        cin: teacher.cin,
        isActive: teacher.isActive,
        createdAt: teacher.createdAt,
      };
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const target = this.getUniqueConstraintTarget(error);
      if (target.includes('email')) {
        throw new ConflictException('Teacher email already in use');
      }
      if (target.includes('cin')) {
        throw new ConflictException('Teacher CIN already in use');
      }

      throw new ConflictException(
        'Teacher already exists with the provided unique fields',
      );
    }
  }

  getStatus(): TeacherStatusResponseDto {
    return {
      module: 'teacher',
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

  private getUniqueConstraintTarget(error: {
    meta?: { target?: unknown };
  }): string {
    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.map((value) => String(value).toLowerCase()).join(',');
    }

    return typeof target === 'string' ? target.toLowerCase() : '';
  }
}
