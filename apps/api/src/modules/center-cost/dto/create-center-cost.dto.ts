import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
} from 'class-validator';
import { DeductionType } from '../../../generated/prisma/enums';
import { IsValidCenterCostValue } from '../validators/center-cost-value.validator';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimOptionalString = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const toNumber = ({ value }: TransformFnParams): unknown => {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? Number(normalized) : value;
  }

  return value;
};

export class CreateCenterCostDto {
  @Transform(trimOptionalString)
  @IsOptional()
  @IsUUID()
  teacher_id?: string;

  @Transform(trimString)
  @IsString()
  @MaxLength(140)
  name!: string;

  @Transform(trimString)
  @IsEnum(DeductionType)
  deduction_type!: DeductionType;

  @Transform(toNumber)
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 4 },
    { message: 'value must be a valid number with up to 4 decimals' },
  )
  @Max(99999999.9999, {
    message: 'value must be less than or equal to 99999999.9999',
  })
  @IsValidCenterCostValue()
  value!: number;
}
