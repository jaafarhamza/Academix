import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/enums';

export type PaymentCreatedEventPayload = {
  payment_id: string;
  center_id: string;
  student_id: string;
  teacher_id: string;
  student_group_id: string | null;
  course_session_id: string | null;
  amount: number;
  rest: number;
  paid_amount: number;
  payment_date: string;
  method: PaymentMethod;
  status: PaymentStatus;
  receipt_url: string | null;
  created_at: string;
};
