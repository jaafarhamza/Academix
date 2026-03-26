import type { UserRole } from '../../../generated/prisma/enums';

export class TeacherSubjectSummaryDto {
  id!: string;
  name!: string;
}

export class TeacherDetailResponseDto {
  id!: string;
  center_id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  phone!: string;
  role!: UserRole;
  cin!: string | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  hourlyRate!: number | null;
  maxHoursPerWeek!: number | null;
  subjects!: TeacherSubjectSummaryDto[];
  hoursThisWeek!: number;
  hoursThisMonth!: number;
}
