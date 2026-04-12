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

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const toNullableTeacherId = ({ value }: TransformFnParams): unknown => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  return value;
};

const toOptionalNumber = ({ value }: TransformFnParams): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? Number(normalized) : undefined;
  }

  return value;
};

export class UpdateCenterCostDto {
  @Transform(toNullableTeacherId)
  @IsOptional()
  @IsUUID()
  teacher_id?: string | null;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(140)
  name?: string;

  @Transform(trimString)
  @IsOptional()
  @IsEnum(DeductionType)
  deduction_type?: DeductionType;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 4 },
    { message: 'value must be a valid number with up to 4 decimals' },
  )
  @Max(99999999.9999, {
    message: 'value must be less than or equal to 99999999.9999',
  })
  value?: number;
}
