import type { UserRole } from '../../../generated/prisma/enums';

export class SecretaryResponseDto {
  id!: string;
  center_id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  phone!: string;
  role!: UserRole;
  cin!: string | null;
  isActive!: boolean;
  createdAt!: Date;
}
