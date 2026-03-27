import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimAndLowercase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class UpdateCenterProfileDto {
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

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  centerName?: string;

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
}
