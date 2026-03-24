export type CenterJwtPayload = {
  sub: string;
  centerId: string;
  email: string;
  role: 'ADMIN';
  subdomain: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
};
