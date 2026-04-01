import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { DayOfWeek, SessionStatus } from '../../../generated/prisma/enums';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const toOptionalInteger = ({ value }: TransformFnParams): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
};

export class QuerySessionDto {
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  teacher_id?: string;

  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  student_group_id?: string;

  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  room_id?: string;

  @Transform(trimString)
  @IsOptional()
  @IsEnum(DayOfWeek)
  day?: DayOfWeek;

  @Transform(trimString)
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @Transform(trimString)
  @IsOptional()
  @IsDateString()
  completed_from?: string;

  @Transform(trimString)
  @IsOptional()
  @IsDateString()
  completed_to?: string;

  @Transform(toOptionalInteger)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Transform(toOptionalInteger)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
