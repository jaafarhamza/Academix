import { DayOfWeek, SessionStatus } from '../../../generated/prisma/enums';

export type SessionRescheduledEventPayload = {
  session_id: string;
  center_id: string;
  teacher_id: string;
  subject_id: string;
  student_id: string | null;
  student_group_id: string | null;
  room_id: string;
  previous_day: DayOfWeek;
  previous_start_time: string;
  previous_end_time: string;
  day: DayOfWeek;
  start_time: string;
  end_time: string;
  status: SessionStatus;
  rescheduled_at: string;
};
