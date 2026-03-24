import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

const trimAndLowercase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CenterLoginDto {
  @Transform(trimAndLowercase)
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
