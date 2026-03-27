export type AuthenticatedCenterAdmin = {
  id: string;
  center_id: string;
  email: string;
  role: 'ADMIN';
  subdomain: string;
};
