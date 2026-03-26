import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class SuperAdminRefreshTokenDto {
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}
