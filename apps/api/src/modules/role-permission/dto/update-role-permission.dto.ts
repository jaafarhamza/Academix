import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateRolePermissionDto {
  @IsOptional()
  @IsBoolean()
  isGranted?: boolean;
}
