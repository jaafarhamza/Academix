import { Transform, type TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateSubjectDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(140)
  name!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(5000)
  description!: string;
}
