import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SchoolCycle, SchoolYear } from '../../../generated/prisma/enums';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimAndUppercase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === 'object' && input !== null;

const toOptionalBoolean = ({ key, obj, value }: TransformFnParams): unknown => {
  const transformedValue = value as unknown;
  const rawValueFromObject =
    typeof key === 'string' && isRecord(obj) ? obj[key] : undefined;
  const rawValue =
    typeof rawValueFromObject === 'string'
      ? rawValueFromObject
      : transformedValue;

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return undefined;
  }

  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return transformedValue;
};

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

export class QueryStudentDto {
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @Transform(trimAndUppercase)
  @IsOptional()
  @IsEnum(SchoolCycle)
  schoolCycle?: SchoolCycle;

  @Transform(trimAndUppercase)
  @IsOptional()
  @IsEnum(SchoolYear)
  schoolYear?: SchoolYear;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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
