import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UserRefreshTokenDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
