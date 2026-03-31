import type { SchoolCycle, SchoolYear } from '../../../generated/prisma/enums';

export class StudentGroupResponseDto {
  id!: string;
  center_id!: string;
  teacher_subject_id!: string;
  name!: string;
  schoolCycle!: SchoolCycle;
  schoolYear!: SchoolYear;
}
