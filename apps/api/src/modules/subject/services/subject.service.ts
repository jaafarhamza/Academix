import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { QuerySubjectDto } from '../dto/query-subject.dto';
import { SubjectDetailResponseDto } from '../dto/subject-detail-response.dto';
import { SubjectResponseDto } from '../dto/subject-response.dto';
import { SubjectStatusResponseDto } from '../dto/subject-status-response.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';

@Injectable()
export class SubjectService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    centerId: string,
    payload: CreateSubjectDto,
  ): Promise<SubjectResponseDto> {
    try {
      const subject = await this.prismaService.subject.create({
        data: {
          centerId,
          name: payload.name,
          description: payload.description,
        },
        select: this.getSubjectSelect(),
      });

      return this.toSubjectResponse(subject);
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      throw new ConflictException('Subject name already in use');
    }
  }

  async findAll(
    centerId: string,
    query: QuerySubjectDto,
  ): Promise<SubjectResponseDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const subjects = await this.prismaService.subject.findMany({
      where: {
        centerId,
        ...(query.search
          ? {
              OR: [
                {
                  name: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  description: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip,
      take: limit,
      select: this.getSubjectSelect(),
    });

    return subjects.map((subject) => this.toSubjectResponse(subject));
  }

  async findOne(
    centerId: string,
    id: string,
  ): Promise<SubjectDetailResponseDto> {
    const subject = await this.findSubjectDetailOrThrow(centerId, id);
    return this.toSubjectDetailResponse(subject);
  }

  async update(
    centerId: string,
    id: string,
    payload: UpdateSubjectDto,
  ): Promise<SubjectDetailResponseDto> {
    const existingSubject = await this.findSubjectDetailOrThrow(centerId, id);
    const data = this.buildSubjectUpdateData(payload);

    if (Object.keys(data).length === 0) {
      return this.toSubjectDetailResponse(existingSubject);
    }

    try {
      const subject = await this.prismaService.subject.update({
        where: {
          id,
        },
        data,
        select: this.getSubjectDetailSelect(),
      });

      return this.toSubjectDetailResponse(subject);
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      throw new ConflictException('Subject name already in use');
    }
  }

  async remove(centerId: string, id: string): Promise<void> {
    await this.findSubjectStateOrThrow(centerId, id);

    try {
      await this.prismaService.subject.delete({
        where: {
          id,
        },
      });
    } catch (error: unknown) {
      if (this.isForeignKeyConstraintError(error)) {
        throw new ConflictException(
          'Cannot delete subject because it is linked to other records',
        );
      }

      throw error;
    }
  }

  getStatus(): SubjectStatusResponseDto {
    return {
      module: 'subject',
      status: 'ready',
    };
  }

  private getSubjectSelect() {
    return {
      id: true,
      centerId: true,
      name: true,
      description: true,
    };
  }

  private getSubjectDetailSelect() {
    return {
      ...this.getSubjectSelect(),
      _count: {
        select: {
          teacherSubjects: true,
          courseSessions: true,
        },
      },
    };
  }

  private async findSubjectDetailOrThrow(centerId: string, id: string) {
    const subject = await this.prismaService.subject.findFirst({
      where: {
        id,
        centerId,
      },
      select: this.getSubjectDetailSelect(),
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  private async findSubjectStateOrThrow(centerId: string, id: string) {
    const subject = await this.prismaService.subject.findFirst({
      where: {
        id,
        centerId,
      },
      select: {
        id: true,
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  private buildSubjectUpdateData(payload: UpdateSubjectDto): SubjectUpdateData {
    const data: SubjectUpdateData = {};

    if (payload.name !== undefined) {
      data.name = payload.name;
    }
    if (payload.description !== undefined) {
      data.description = payload.description;
    }

    return data;
  }

  private toSubjectResponse(subject: {
    id: string;
    centerId: string;
    name: string;
    description: string;
  }): SubjectResponseDto {
    return {
      id: subject.id,
      center_id: subject.centerId,
      name: subject.name,
      description: subject.description,
    };
  }

  private toSubjectDetailResponse(subject: {
    id: string;
    centerId: string;
    name: string;
    description: string;
    _count: {
      teacherSubjects: number;
      courseSessions: number;
    };
  }): SubjectDetailResponseDto {
    return {
      id: subject.id,
      center_id: subject.centerId,
      name: subject.name,
      description: subject.description,
      teacherAssignmentsCount: subject._count.teacherSubjects,
      sessionsCount: subject._count.courseSessions,
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

type SubjectUpdateData = {
  name?: string;
  description?: string;
};
