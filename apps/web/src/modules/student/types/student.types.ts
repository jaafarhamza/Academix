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

export type StudentEnrollmentSummary = {
  id: string;
  enrollmentDate: string;
  isActive: boolean;
  groupId: string;
  groupName: string;
  schoolCycle: SchoolCycle;
  schoolYear: SchoolYear;
};

export type StudentPaymentStatus = "PAID" | "PARTIALLY_PAID" | "UNPAID";
export type StudentPaymentMethod = "CASH";

export type StudentPaymentSummary = {
  id: string;
  amount: number;
  rest: number;
  paidAmount: number;
  status: StudentPaymentStatus;
  method: StudentPaymentMethod;
  paymentDate: string;
  receiptUrl: string | null;
  teacherId: string;
  teacherName: string;
  studentGroupId: string | null;
  studentGroupName: string | null;
};

export type StudentPaymentOverview = {
  totalPayments: number;
  totalAmount: number;
  totalPaid: number;
  totalRest: number;
  outstandingBalance: number;
  lastPaymentDate: string | null;
};

export type StudentDetail = Student & {
  updatedAt: string;
  enrollments: StudentEnrollmentSummary[];
  payments: StudentPaymentSummary[];
  paymentSummary: StudentPaymentOverview;
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
