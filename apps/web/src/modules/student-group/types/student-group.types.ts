import type { SchoolCycle, SchoolYear } from "@/modules/student/types/student.types";

export type StudentGroup = {
  id: string;
  center_id: string;
  teacher_subject_id: string;
  name: string;
  schoolCycle: SchoolCycle;
  schoolYear: SchoolYear;
};

export type StudentGroupDetail = StudentGroup & {
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  studentNumbers: number;
};

export type StudentGroupListQuery = {
  schoolCycle?: SchoolCycle;
  schoolYear?: SchoolYear;
  teacherId?: string;
  subjectId?: string;
  page?: number;
  limit?: number;
};

export type StudentGroupStatus = {
  module: string;
  status: string;
};

export type StudentGroupCreatePayload = {
  teacherSubjectId: string;
  schoolCycle: SchoolCycle;
  schoolYear: SchoolYear;
  name?: string;
};

export type StudentGroupUpdatePayload = {
  teacherSubjectId?: string;
  schoolCycle?: SchoolCycle;
  schoolYear?: SchoolYear;
  name?: string;
};
