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

export type TeacherSubjectSummary = {
  id: string;
  name: string;
};

export type TeacherDetail = Teacher & {
  updatedAt: string;
  hourlyRate: number | null;
  maxHoursPerWeek: number | null;
  subjects: TeacherSubjectSummary[];
  hoursThisWeek: number;
  hoursThisMonth: number;
};

export type TeacherListQuery = {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
};

export type TeacherCreatePayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  cin: string;
  hourlyRate?: number;
  maxHoursPerWeek?: number;
};

export type TeacherUpdatePayload = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cin: string;
  hourlyRate: number | null;
  maxHoursPerWeek: number | null;
}>;

export type TeacherIncomeQuery = {
  month?: string;
};

export type TeacherIncomeDeductionBreakdown = {
  percentage_of_total: number;
  percentage_per_student: number;
  fixed_per_student: number;
  total: number;
};

export type TeacherMonthlyIncome = {
  teacher_id: string;
  center_id: string;
  month: string;
  collected_payments: number;
  paid_students: number;
  deduction_breakdown: TeacherIncomeDeductionBreakdown;
  expenses: number;
  net_income: number;
};
