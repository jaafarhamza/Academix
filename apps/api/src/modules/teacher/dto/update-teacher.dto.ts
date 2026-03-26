import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimAndLowercase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const trimAndUppercase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const toNullableNumber = ({ value }: { value: unknown }): unknown => {
  if (value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
};

export class UpdateTeacherDto {
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName?: string;

  @Transform(trimAndLowercase)
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'phone must be a valid international phone number',
  })
  phone?: string;

  @Transform(trimAndUppercase)
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'cin must contain only letters, numbers, and hyphens',
  })
  cin?: string;

  @Transform(toNullableNumber)
  @IsOptional()
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'hourlyRate must be a valid number with up to 2 decimals' },
  )
  @Min(0, { message: 'hourlyRate must be greater than or equal to 0' })
  @Max(999999.99, {
    message: 'hourlyRate must be less than or equal to 999999.99',
  })
  hourlyRate?: number | null;

  @Transform(toNullableNumber)
  @IsOptional()
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    {
      message: 'maxHoursPerWeek must be a valid number with up to 2 decimals',
    },
  )
  @Min(0, { message: 'maxHoursPerWeek must be greater than or equal to 0' })
  @Max(168, { message: 'maxHoursPerWeek must be less than or equal to 168' })
  maxHoursPerWeek?: number | null;
}
