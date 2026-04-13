import { UserRole } from '../../../generated/prisma/enums';

export class CenterExpenseResponseDto {
  id!: string;
  center_id!: string;
  user_id!: string;
  userName!: string;
  userRole!: UserRole;
  amount!: number;
  description!: string;
  date!: string;
  created_at!: string;
}
