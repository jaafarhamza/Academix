import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsUUID,
  Matches,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { DayOfWeek } from '../../../generated/prisma/enums';

const DAY_ALIAS_MAP: Record<string, DayOfWeek> = {
  MON: DayOfWeek.MONDAY,
  MONDAY: DayOfWeek.MONDAY,
  TUE: DayOfWeek.TUESDAY,
  TUESDAY: DayOfWeek.TUESDAY,
  WED: DayOfWeek.WEDNESDAY,
  WEDNESDAY: DayOfWeek.WEDNESDAY,
  THU: DayOfWeek.THURSDAY,
  THURSDAY: DayOfWeek.THURSDAY,
  FRI: DayOfWeek.FRIDAY,
  FRIDAY: DayOfWeek.FRIDAY,
  SAT: DayOfWeek.SATURDAY,
  SATURDAY: DayOfWeek.SATURDAY,
  SUN: DayOfWeek.SUNDAY,
  SUNDAY: DayOfWeek.SUNDAY,
};

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizeDay = ({ value, obj }: TransformFnParams): unknown => {
  const directValue =
    typeof value === 'string' ? value : (obj as Record<string, unknown>)?.day;
  if (typeof directValue !== 'string') {
    return value;
  }

  const normalized = directValue.trim().toUpperCase();
  return DAY_ALIAS_MAP[normalized] ?? directValue;
};

function toTotalMinutes(time: string): number {
  const [hoursPart, minutesPart] = time.split(':');
  const hours = Number.parseInt(hoursPart ?? '', 10);
  const minutes = Number.parseInt(minutesPart ?? '', 10);
  return hours * 60 + minutes;
}

@ValidatorConstraint({ name: 'IsEndAfterStartTime', async: false })
class IsEndAfterStartTimeConstraint implements ValidatorConstraintInterface {
  validate(endTime: unknown, args: ValidationArguments): boolean {
    const payload = args.object as CreateSessionDto;

    if (typeof payload.start_time !== 'string' || typeof endTime !== 'string') {
      return true;
    }

    return toTotalMinutes(endTime) > toTotalMinutes(payload.start_time);
  }

  defaultMessage(): string {
    return 'end_time must be after start_time';
  }
}

export class CreateSessionDto {
  @Transform(trimString)
  @IsUUID()
  teacher_id!: string;

  @Transform(trimString)
  @IsUUID()
  subject_id!: string;

  @Transform(trimString)
  @IsUUID()
  student_group_id!: string;

  @Transform(trimString)
  @IsUUID()
  room_id!: string;

  @Transform(normalizeDay)
  @IsEnum(DayOfWeek)
  day!: DayOfWeek;

  @Transform(trimString)
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'start_time must use HH:mm format',
  })
  start_time!: string;

  @Transform(trimString)
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'end_time must use HH:mm format',
  })
  @Validate(IsEndAfterStartTimeConstraint)
  end_time!: string;
}
