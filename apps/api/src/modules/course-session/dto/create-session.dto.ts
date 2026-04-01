import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
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

@ValidatorConstraint({
  name: 'HasExactlyOneSessionTarget',
  async: false,
})
class HasExactlyOneSessionTargetConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const payload = args.object as CreateSessionDto;
    const hasStudentId =
      typeof payload.student_id === 'string' && payload.student_id.length > 0;
    const hasStudentGroupId =
      typeof payload.student_group_id === 'string' &&
      payload.student_group_id.length > 0;

    return Number(hasStudentId) + Number(hasStudentGroupId) === 1;
  }

  defaultMessage(): string {
    return 'Exactly one of student_id or student_group_id must be provided';
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
  @IsOptional()
  @IsUUID()
  student_id?: string;

  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  student_group_id?: string;

  @Validate(HasExactlyOneSessionTargetConstraint)
  session_target?: never;

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
