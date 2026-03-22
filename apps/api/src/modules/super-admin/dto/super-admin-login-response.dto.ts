export class AuthenticatedSuperAdminDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
}

export class SuperAdminLoginResponseDto {
  accessToken!: string;
  tokenType!: 'Bearer';
  expiresIn!: string;
  superAdmin!: AuthenticatedSuperAdminDto;
}
