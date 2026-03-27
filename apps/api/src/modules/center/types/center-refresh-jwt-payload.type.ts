export type CenterRefreshJwtPayload = {
  sub: string;
  center_id: string;
  email: string;
  role: 'ADMIN';
  subdomain: string;
  token_type: 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
};
