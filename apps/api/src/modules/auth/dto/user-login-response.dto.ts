import type { UserRole } from '../../../generated/prisma/enums';

export class AuthenticatedUserDto {
  id!: string;
  center_id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  role!: UserRole;
}

export class UserLoginResponseDto {
  accessToken!: string;
  tokenType!: 'Bearer';
  expiresIn!: string;
  user!: AuthenticatedUserDto;
}
