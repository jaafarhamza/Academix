import { Transform } from 'class-transformer';
import { IsEnum, Matches, Validate } from 'class-validator';
import { DayOfWeek } from '../../../generated/prisma/enums';
import {
  IsEndAfterStartTimeConstraint,
  normalizeDay,
  SESSION_TIME_PATTERN,
  trimString,
} from './session-schedule.validation';

export class RescheduleSessionDto {
  @Transform(normalizeDay)
  @IsEnum(DayOfWeek)
  day!: DayOfWeek;

  @Transform(trimString)
  @Matches(SESSION_TIME_PATTERN, {
    message: 'start_time must use HH:mm format',
  })
  start_time!: string;

  @Transform(trimString)
  @Matches(SESSION_TIME_PATTERN, {
    message: 'end_time must use HH:mm format',
  })
  @Validate(IsEndAfterStartTimeConstraint)
  end_time!: string;
}
