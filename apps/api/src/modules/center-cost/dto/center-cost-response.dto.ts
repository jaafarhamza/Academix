import { DeductionScope, DeductionType } from '../../../generated/prisma/enums';

export class CenterCostResponseDto {
  id!: string;
  center_id!: string;
  teacher_id!: string | null;
  teacherName!: string | null;
  name!: string;
  deduction_type!: DeductionType;
  scope!: DeductionScope;
  value!: number;
  is_active!: boolean;
  created_at!: string;
}
