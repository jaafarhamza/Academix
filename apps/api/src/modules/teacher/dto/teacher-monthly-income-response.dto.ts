export class TeacherIncomeDeductionBreakdownDto {
  percentage_of_total!: number;
  percentage_per_student!: number;
  fixed_per_student!: number;
  total!: number;
}

export class TeacherMonthlyIncomeResponseDto {
  teacher_id!: string;
  center_id!: string;
  month!: string;
  collected_payments!: number;
  paid_students!: number;
  deduction_breakdown!: TeacherIncomeDeductionBreakdownDto;
  expenses!: number;
  net_income!: number;
}
