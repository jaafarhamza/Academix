import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SchoolCycle, SchoolYear } from '../../../generated/prisma/enums';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimOptionalString = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const trimAndUppercase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class UpdateStudentGroupDto {
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  teacherSubjectId?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  name?: string;

  @Transform(trimAndUppercase)
  @IsOptional()
  @IsEnum(SchoolCycle)
  schoolCycle?: SchoolCycle;

  @Transform(trimAndUppercase)
  @IsOptional()
  @IsEnum(SchoolYear)
  schoolYear?: SchoolYear;
}
