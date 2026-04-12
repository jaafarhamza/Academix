import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

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

export enum CenterCostScopeFilter {
  ALL = 'ALL',
  GLOBAL = 'GLOBAL',
  PER_TEACHER = 'PER_TEACHER',
}

export class QueryCenterCostDto {
  @Transform(trimAndUppercase)
  @IsOptional()
  @IsEnum(CenterCostScopeFilter)
  scope?: CenterCostScopeFilter;

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
