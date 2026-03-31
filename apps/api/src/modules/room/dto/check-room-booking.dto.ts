import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, Matches } from 'class-validator';
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

const normalizeDay = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toUpperCase();
  return DAY_ALIAS_MAP[normalized] ?? value;
};

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CheckRoomBookingDto {
  @Transform(normalizeDay)
  @IsEnum(DayOfWeek)
  day!: DayOfWeek;

  @Transform(trimString)
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'start must use HH:mm format',
  })
  start!: string;

  @Transform(trimString)
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'end must use HH:mm format',
  })
  end!: string;
}
