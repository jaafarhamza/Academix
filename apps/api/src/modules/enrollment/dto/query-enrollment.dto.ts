import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

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

export class QueryEnrollmentDto {
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  studentGroupId?: string;

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
