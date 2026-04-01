import { Transform } from 'class-transformer';
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
import {
  IsEndAfterStartTimeConstraint,
  normalizeDay,
  SESSION_TIME_PATTERN,
  trimString,
} from './session-schedule.validation';

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
