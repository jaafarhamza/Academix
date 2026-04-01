export type Room = {
  id: string;
  center_id: string;
  floor: number;
  roomName: string;
  isAvailable: boolean;
};

export type RoomDetail = Room & {
  sessionsCount: number;
};

export type RoomListQuery = {
  search?: string;
  floor?: number;
  isAvailable?: boolean;
  page?: number;
  limit?: number;
};

export type RoomCreatePayload = {
  floor: number;
  roomName: string;
  isAvailable?: boolean;
};

export type RoomUpdatePayload = Partial<{
  floor: number;
  roomName: string;
  isAvailable: boolean;
}>;

export type RoomScheduleDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type RoomScheduleSessionStatus =
  | "SCHEDULED"
  | "CANCELLED"
  | "COMPLETED";

export type RoomScheduleSession = {
  id: string;
  day: RoomScheduleDay;
  start: string;
  end: string;
  status: RoomScheduleSessionStatus;
  subject_id: string;
  subjectName: string;
  teacher_id: string;
  teacherName: string;
  student_id: string | null;
  studentName: string | null;
  student_group_id: string | null;
  studentGroupName: string | null;
};

export type RoomSchedule = {
  room_id: string;
  roomName: string;
  floor: number;
  isAvailable: boolean;
  totalSessions: number;
  sessions: RoomScheduleSession[];
};
