export type CenterJwtPayload = {
  sub: string;
  center_id: string;
  email: string;
  role: 'ADMIN';
  subdomain: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
};
