export type Secretary = {
  id: string;
  center_id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "SECRETARY";
  cin: string | null;
  isActive: boolean;
  createdAt: string;
};

export type SecretaryListQuery = {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
};
