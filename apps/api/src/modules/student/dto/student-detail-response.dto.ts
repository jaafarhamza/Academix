import type {
  PaymentMethod,
  PaymentStatus,
  SchoolCycle,
  SchoolYear,
  UserRole,
} from '../../../generated/prisma/enums';

export class StudentEnrollmentSummaryDto {
  id!: string;
  enrollmentDate!: Date;
  isActive!: boolean;
  groupId!: string;
  groupName!: string;
  schoolCycle!: SchoolCycle;
  schoolYear!: SchoolYear;
}

export class StudentPaymentSummaryDto {
  id!: string;
  amount!: number;
  rest!: number;
  paidAmount!: number;
  status!: PaymentStatus;
  method!: PaymentMethod;
  paymentDate!: Date;
  receiptUrl!: string | null;
  teacherId!: string;
  teacherName!: string;
  studentGroupId!: string | null;
  studentGroupName!: string | null;
}

export class StudentPaymentOverviewDto {
  totalPayments!: number;
  totalAmount!: number;
  totalPaid!: number;
  totalRest!: number;
  outstandingBalance!: number;
  lastPaymentDate!: Date | null;
}

export class StudentDetailResponseDto {
  id!: string;
  center_id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  phone!: string;
  role!: UserRole;
  parentPhone!: string | null;
  schoolName!: string | null;
  schoolCycle!: SchoolCycle | null;
  schoolYear!: SchoolYear | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  enrollments!: StudentEnrollmentSummaryDto[];
  payments!: StudentPaymentSummaryDto[];
  paymentSummary!: StudentPaymentOverviewDto;
}
