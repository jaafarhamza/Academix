import type { SchoolCycle, SchoolYear } from '../../../generated/prisma/enums';

export class StudentGroupDetailResponseDto {
  id!: string;
  center_id!: string;
  teacher_subject_id!: string;
  name!: string;
  schoolCycle!: SchoolCycle;
  schoolYear!: SchoolYear;
  teacherId!: string;
  teacherName!: string;
  subjectId!: string;
  subjectName!: string;
  studentNumbers!: number;
}
