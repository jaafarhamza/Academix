import type { UserRole } from '../../../generated/prisma/enums';

export type AuthenticatedUser = {
  id: string;
  center_id: string;
  email: string;
  role: UserRole;
};
