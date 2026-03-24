import { IsEnum, IsOptional } from 'class-validator';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';

export class QueryRolePermissionDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(PermissionAction)
  permission?: PermissionAction;
}
