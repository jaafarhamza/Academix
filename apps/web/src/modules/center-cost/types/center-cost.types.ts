export type CenterCostDeductionType =
  | "PERCENTAGE_OF_TOTAL"
  | "PERCENTAGE_PER_STUDENT"
  | "FIXED_PER_STUDENT";

export type CenterCostScope = "GLOBAL" | "PER_TEACHER";
export type CenterCostScopeFilter = "ALL" | "GLOBAL" | "PER_TEACHER";

export type CenterCost = {
  id: string;
  center_id: string;
  teacher_id: string | null;
  teacherName: string | null;
  name: string;
  deduction_type: CenterCostDeductionType;
  scope: CenterCostScope;
  value: number;
  is_active: boolean;
  created_at: string;
};

export type CenterCostListQuery = Partial<{
  scope: CenterCostScopeFilter;
  page: number;
  limit: number;
}>;

export type CenterCostCreatePayload = {
  teacher_id?: string;
  name: string;
  deduction_type: CenterCostDeductionType;
  value: number;
};

export type CenterCostUpdatePayload = Partial<{
  teacher_id: string | null;
  name: string;
  deduction_type: CenterCostDeductionType;
  value: number;
}>;
