import { DayOfWeek } from '../../../generated/prisma/enums';

export type SessionCancelledEventPayload = {
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
  status: 'CANCELLED';
  cancelled_at: string;
};
