import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';

export class CreateRolePermissionDto {
  @IsEnum(UserRole)
  role!: UserRole;

  @IsEnum(PermissionAction)
  permission!: PermissionAction;

  @IsOptional()
  @IsBoolean()
  isGranted?: boolean;
}
