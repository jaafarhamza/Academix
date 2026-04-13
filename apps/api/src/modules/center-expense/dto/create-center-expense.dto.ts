import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

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

export class CreateCenterExpenseDto {
  @Transform(trimString)
  @IsUUID()
  user_id!: string;

  @Transform(toNumber)
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'amount must be a valid number with up to 2 decimals' },
  )
  @Min(0.01, { message: 'amount must be greater than 0' })
  @Max(99999999.99, {
    message: 'amount must be less than or equal to 99999999.99',
  })
  amount!: number;

  @Transform(trimString)
  @IsString()
  @MinLength(4)
  @MaxLength(5000)
  description!: string;

  @Transform(trimString)
  @IsDateString()
  date!: string;
}
