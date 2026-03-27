import { IsOptional, IsString, MinLength } from 'class-validator';

export class CenterRefreshTokenDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  refreshToken?: string;
}
