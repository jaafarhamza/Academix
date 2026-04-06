import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/enums';

export class PaymentResponseDto {
  id!: string;
  center_id!: string;
  student_id!: string;
  studentName!: string;
  teacher_id!: string;
  teacherName!: string;
  student_group_id!: string | null;
  studentGroupName!: string | null;
  course_session_id!: string | null;
  amount!: number;
  rest!: number;
  paidAmount!: number;
  paymentDate!: string;
  method!: PaymentMethod;
  status!: PaymentStatus;
  receiptUrl!: string | null;
  notes!: string | null;
  createdAt!: string;
}
