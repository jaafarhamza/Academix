import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

export enum TeacherHoursPeriod {
  WEEK = 'week',
  MONTH = 'month',
}

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class TeacherHoursQueryDto {
  @Transform(trimString)
  @IsOptional()
  @IsEnum(TeacherHoursPeriod)
  period: TeacherHoursPeriod = TeacherHoursPeriod.WEEK;
}
