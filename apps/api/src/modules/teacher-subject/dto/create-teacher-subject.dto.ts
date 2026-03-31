import { Transform, type TransformFnParams } from 'class-transformer';
import { IsUUID } from 'class-validator';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTeacherSubjectDto {
  @Transform(trimString)
  @IsUUID()
  teacherId!: string;

  @Transform(trimString)
  @IsUUID()
  subjectId!: string;
}
