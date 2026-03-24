export class AuthenticatedCenterDto {
  id!: string;
  centerName!: string;
  email!: string;
  subdomain!: string;
  role!: 'ADMIN';
}

export class CenterLoginResponseDto {
  accessToken!: string;
  tokenType!: 'Bearer';
  expiresIn!: string;
  center!: AuthenticatedCenterDto;
}
