import { DayOfWeek, SessionStatus } from '../../../generated/prisma/enums';

export type SessionCreatedEventPayload = {
  session_id: string;
  center_id: string;
  teacher_id: string;
  subject_id: string;
  student_id: string | null;
  student_group_id: string | null;
  room_id: string;
  day: DayOfWeek;
  start_time: string;
  end_time: string;
  status: SessionStatus;
  created_at: string;
};
