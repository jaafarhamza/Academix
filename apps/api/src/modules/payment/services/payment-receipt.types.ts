import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/enums';

export type PaymentReceiptTemplateInput = {
  receiptNumber: string;
  centerName: string;
  centerLogoUrl?: string | null;
  centerStampLabel?: string | null;
  studentName: string;
  teacherName: string;
  studentGroupName?: string | null;
  amount: number;
  paidAmount: number;
  rest: number;
  paymentDate: string;
  method: PaymentMethod;
  status: PaymentStatus;
  notes?: string | null;
};
