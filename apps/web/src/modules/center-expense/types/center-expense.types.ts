export type CenterExpenseUserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "TEACHER"
  | "SECRETARY"
  | "STUDENT";

export type CenterExpense = {
  id: string;
  center_id: string;
  user_id: string;
  userName: string;
  userRole: CenterExpenseUserRole;
  amount: number;
  description: string;
  date: string;
  created_at: string;
};

export type CenterExpenseListQuery = {
  user_id?: string;
  month?: string;
  page?: number;
  limit?: number;
};

export type CenterExpenseCreatePayload = {
  user_id: string;
  amount: number;
  description: string;
  date: string;
};

export type CenterExpenseUpdatePayload = Partial<{
  user_id: string;
  amount: number;
  description: string;
  date: string;
}>;
