import type { UserRole } from '../../../generated/prisma/enums';

export type UserRefreshJwtPayload = {
  sub: string;
  user_id: string;
  center_id: string;
  email: string;
  role: UserRole;
  token_type: 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
};
