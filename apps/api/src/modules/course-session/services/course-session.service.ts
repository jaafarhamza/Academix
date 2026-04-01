import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { SessionStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { CourseSessionStatusResponseDto } from '../dto/course-session-status-response.dto';

@Injectable()
export class CourseSessionService {
  constructor(private readonly prismaService: PrismaService) {}

  getStatus(): CourseSessionStatusResponseDto {
    return {
      module: 'course-session',
      status: 'ready',
    };
  }

  async ensureTeacherAvailability(
    centerId: string,
    payload: CreateSessionDto,
    options?: {
      excludeSessionId?: string;
    },
  ): Promise<void> {
    const { startTime, endTime } = this.getValidatedTimeRange(
      payload.start_time,
      payload.end_time,
    );

    const conflictingSessions = await this.prismaService.courseSession.count({
      where: {
        centerId,
        teacherId: payload.teacher_id,
        day: payload.day,
        status: {
          not: SessionStatus.CANCELLED,
        },
        ...(options?.excludeSessionId
          ? {
              id: {
                not: options.excludeSessionId,
              },
            }
          : {}),
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
      },
    });

    if (conflictingSessions > 0) {
      throw new ConflictException(
        'Teacher is not available for the selected day/time',
      );
    }
  }

  private toSessionTime(value: string): Date {
    const [hoursPart, minutesPart] = value.split(':');
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException('Invalid time format. Use HH:mm');
    }

    return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
  }

  private getValidatedTimeRange(
    start: string,
    end: string,
  ): { startTime: Date; endTime: Date } {
    const startTime = this.toSessionTime(start);
    const endTime = this.toSessionTime(end);

    if (startTime.getTime() >= endTime.getTime()) {
      throw new BadRequestException('end_time must be after start_time');
    }

    return {
      startTime,
      endTime,
    };
  }
}
