export type Teacher = {
  id: string;
  center_id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "TEACHER";
  cin: string | null;
  isActive: boolean;
  createdAt: string;
};

export type TeacherListQuery = {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
};
