import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, Matches } from 'class-validator';
import { DayOfWeek } from '../../../generated/prisma/enums';

const trimAndUppercase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CheckRoomBookingDto {
  @Transform(trimAndUppercase)
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
