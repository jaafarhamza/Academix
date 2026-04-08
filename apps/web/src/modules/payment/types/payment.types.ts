export type PaymentStatus = "PAID" | "PARTIALLY_PAID" | "UNPAID";
export type PaymentMethod = "CASH";

export type Payment = {
  id: string;
  center_id: string;
  student_id: string;
  studentName: string;
  teacher_id: string;
  teacherName: string;
  student_group_id: string | null;
  studentGroupName: string | null;
  course_session_id: string | null;
  amount: number;
  rest: number;
  paidAmount: number;
  paymentDate: string;
  method: PaymentMethod;
  status: PaymentStatus;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string;
};

export type PaymentListQuery = Partial<{
  student_id: string;
  teacher_id: string;
  student_group_id: string;
  status: PaymentStatus;
  payment_from: string;
  payment_to: string;
  page: number;
  limit: number;
}>;

export type PaymentCreatePayload = {
  student_id: string;
  teacher_id: string;
  student_group_id?: string;
  amount: number;
  method?: PaymentMethod;
  notes?: string;
};
