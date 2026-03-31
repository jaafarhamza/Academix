import { Transform, type TransformFnParams } from 'class-transformer';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimOptionalString = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export class CreateEnrollmentDto {
  @Transform(trimString)
  @IsUUID()
  studentId!: string;

  @Transform(trimString)
  @IsUUID()
  studentGroupId!: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;
}
