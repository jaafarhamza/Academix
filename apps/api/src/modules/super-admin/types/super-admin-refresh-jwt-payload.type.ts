export type SuperAdminRefreshJwtPayload = {
  sub: string;
  super_admin_id: string;
  email: string;
  role: 'SUPER_ADMIN';
  token_type: 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
};
