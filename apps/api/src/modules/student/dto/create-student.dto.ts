import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SchoolCycle, SchoolYear } from '../../../generated/prisma/enums';
import { IsValidSchoolYearForCycle } from '../validators/school-cycle-school-year.validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimAndLowercase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const trimAndUppercase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateStudentDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @Transform(trimAndLowercase)
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message: 'password must include uppercase, lowercase, number, and symbol',
    },
  )
  password!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'phone must be a valid international phone number',
  })
  phone!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'parentPhone must be a valid international phone number',
  })
  parentPhone!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(140)
  schoolName!: string;

  @Transform(trimAndUppercase)
  @IsEnum(SchoolCycle)
  schoolCycle!: SchoolCycle;

  @Transform(trimAndUppercase)
  @IsEnum(SchoolYear)
  @IsValidSchoolYearForCycle()
  schoolYear!: SchoolYear;
}
