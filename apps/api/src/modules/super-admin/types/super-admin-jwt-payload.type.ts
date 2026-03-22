export type SuperAdminJwtPayload = {
  sub: string;
  email: string;
  role: 'SUPER_ADMIN';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
};
