export const courseSessionDayValues = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export const courseSessionStatusValues = [
  "SCHEDULED",
  "CANCELLED",
  "COMPLETED",
] as const;

export const courseSessionConflictTypeValues = [
  "TEACHER_TIME_OVERLAP",
  "ROOM_TIME_OVERLAP",
  "STUDENT_TIME_OVERLAP",
] as const;

export type CourseSessionDay = (typeof courseSessionDayValues)[number];

export type CourseSessionStatus = (typeof courseSessionStatusValues)[number];

export type CourseSessionConflictType =
  (typeof courseSessionConflictTypeValues)[number];

export type CourseSessionConflict = {
  type: CourseSessionConflictType;
  message: string;
};

export type CourseSession = {
  id: string;
  center_id: string;
  teacher_id: string;
  subject_id: string;
  student_id: string | null;
  student_group_id: string | null;
  room_id: string;
  day: CourseSessionDay;
  startTime: string;
  endTime: string;
  status: CourseSessionStatus;
  createdAt: string;
  updatedAt: string;
};

export type CourseSessionListQuery = Partial<{
  teacherId: string;
  studentGroupId: string;
  roomId: string;
  day: CourseSessionDay;
  status: CourseSessionStatus;
  completedFrom: string;
  completedTo: string;
  page: number;
  limit: number;
}>;

export type CourseSessionCreatePayload = {
  teacherId: string;
  subjectId: string;
  roomId: string;
  day: CourseSessionDay;
  startTime: string;
  endTime: string;
  studentId?: string;
  studentGroupId?: string;
};

export type CourseSessionStatusResponse = {
  module: string;
  status: string;
};
