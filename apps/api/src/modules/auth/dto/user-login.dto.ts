import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimAndLowercase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class UserLoginDto {
  @Transform(trimAndLowercase)
  @IsEmail()
  email!: string;

  @Transform(trimString)
  @IsUUID()
  center_id!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
