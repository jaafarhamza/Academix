import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateSubjectDto {
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  name?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(5000)
  description?: string;
}
