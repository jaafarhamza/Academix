import { Transform, type TransformFnParams } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const toOptionalInteger = ({ value }: TransformFnParams): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
};

export class QueryTeacherSubjectDto {
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @Transform(toOptionalInteger)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Transform(toOptionalInteger)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
