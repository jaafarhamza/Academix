import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum FinancialDashboardPeriod {
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  CUSTOM = 'CUSTOM',
}

function trimUppercaseString({
  value,
}: {
  value: unknown;
}): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : undefined;
}

function trimString({ value }: { value: unknown }): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export class QueryFinancialDashboardDto {
  @Transform(trimUppercaseString)
  @IsOptional()
  @IsEnum(FinancialDashboardPeriod)
  period?: FinancialDashboardPeriod;

  @Transform(trimString)
  @IsOptional()
  @IsDateString()
  from?: string;

  @Transform(trimString)
  @IsOptional()
  @IsDateString()
  to?: string;
}
