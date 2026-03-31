import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { SchoolCycle, SchoolYear } from '../../../generated/prisma/enums';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimAndUppercase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

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

export class QueryStudentGroupDto {
  @Transform(trimAndUppercase)
  @IsOptional()
  @IsEnum(SchoolCycle)
  schoolCycle?: SchoolCycle;

  @Transform(trimAndUppercase)
  @IsOptional()
  @IsEnum(SchoolYear)
  schoolYear?: SchoolYear;

  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  subjectId?: string;

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
