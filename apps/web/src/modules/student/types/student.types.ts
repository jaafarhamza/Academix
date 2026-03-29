export type SchoolCycle = "PRIMARY" | "COLLEGE" | "LYCEE";

export type SchoolYear =
  | "FIRST_YEAR"
  | "SECOND_YEAR"
  | "THIRD_YEAR"
  | "FOURTH_YEAR"
  | "FIFTH_YEAR"
  | "SIXTH_YEAR";

export type Student = {
  id: string;
  center_id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "STUDENT";
  parentPhone: string | null;
  schoolName: string | null;
  schoolCycle: SchoolCycle | null;
  schoolYear: SchoolYear | null;
  isActive: boolean;
  createdAt: string;
};

export type StudentListQuery = {
  search?: string;
  schoolCycle?: SchoolCycle;
  schoolYear?: SchoolYear;
  isActive?: boolean;
  page?: number;
  limit?: number;
};

export type StudentCreatePayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  parentPhone: string;
  schoolName: string;
  schoolCycle: SchoolCycle;
  schoolYear: SchoolYear;
};

export type StudentUpdatePayload = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  parentPhone: string;
  schoolName: string;
  schoolCycle: SchoolCycle;
  schoolYear: SchoolYear;
}>;
