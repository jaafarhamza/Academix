import { DayOfWeek, SessionStatus } from '../../../generated/prisma/enums';

export class RoomScheduleSessionResponseDto {
  id!: string;
  day!: DayOfWeek;
  start!: string;
  end!: string;
  status!: SessionStatus;
  subject_id!: string;
  subjectName!: string;
  teacher_id!: string;
  teacherName!: string;
  student_id!: string | null;
  studentName!: string | null;
  student_group_id!: string | null;
  studentGroupName!: string | null;
}

export class RoomScheduleResponseDto {
  room_id!: string;
  roomName!: string;
  floor!: number;
  isAvailable!: boolean;
  totalSessions!: number;
  sessions!: RoomScheduleSessionResponseDto[];
}
