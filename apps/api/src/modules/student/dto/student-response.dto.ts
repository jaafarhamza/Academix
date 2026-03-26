import type {
  SchoolCycle,
  SchoolYear,
  UserRole,
} from '../../../generated/prisma/enums';

export class StudentResponseDto {
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
}
