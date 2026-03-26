export type SuperAdminCredentials = {
  email: string;
  password: string;
};

export type SuperAdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type SuperAdminAuthResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  superAdmin: SuperAdminUser;
};

export type SuperAdminProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
};
