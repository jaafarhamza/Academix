import { StudentPaymentOverviewDto, StudentPaymentSummaryDto } from './student-detail-response.dto';

export class StudentPaymentHistoryResponseDto {
  id!: string;
  center_id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  phone!: string;
  schoolName!: string | null;
  createdAt!: Date;
  payments!: StudentPaymentSummaryDto[];
  paymentSummary!: StudentPaymentOverviewDto;
}
