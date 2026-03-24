import type { UserRole } from '../../../generated/prisma/enums';

export type UserJwtPayload = {
  sub: string;
  user_id: string;
  center_id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
};
