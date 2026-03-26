import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SchoolCycle, SchoolYear } from '../../../generated/prisma/enums';
import { IsValidSchoolYearForCycle } from '../validators/school-cycle-school-year.validator';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimAndLowercase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const trimAndUppercase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class UpdateStudentDto {
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

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'parentPhone must be a valid international phone number',
  })
  parentPhone?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  schoolName?: string;

  @Transform(trimAndUppercase)
  @IsOptional()
  @IsEnum(SchoolCycle)
  schoolCycle?: SchoolCycle;

  @Transform(trimAndUppercase)
  @IsOptional()
  @IsEnum(SchoolYear)
  @IsValidSchoolYearForCycle()
  schoolYear?: SchoolYear;
}
