export type CenterCredentials = {
  email: string;
  password: string;
};

export type CenterRegistrationPayload = {
  firstName: string;
  lastName: string;
  centerName: string;
  email: string;
  password: string;
  phone: string;
};

export type AuthenticatedCenter = {
  id: string;
  centerName: string;
  email: string;
  subdomain: string;
  role: "ADMIN";
};

export type CenterAuthResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  center: AuthenticatedCenter;
};

export type CenterProfile = {
  id: string;
  firstName: string;
  lastName: string;
  centerName: string;
  email: string;
  phone: string;
  logoUrl: string | null;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
};

export type CenterRegistrationResponse = {
  id: string;
  firstName: string;
  lastName: string;
  centerName: string;
  email: string;
  phone: string;
  logoUrl: string | null;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
};
