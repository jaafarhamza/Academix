import type {
  PermissionAction,
  UserRole,
} from '../../../generated/prisma/enums';

export class RolePermissionResponseDto {
  id!: string;
  center_id!: string;
  role!: UserRole;
  permission!: PermissionAction;
  isGranted!: boolean;
}
