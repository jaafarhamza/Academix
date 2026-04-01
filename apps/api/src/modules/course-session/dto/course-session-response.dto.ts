import { DayOfWeek, SessionStatus } from '../../../generated/prisma/enums';

export class CourseSessionResponseDto {
  id!: string;
  center_id!: string;
  teacher_id!: string;
  subject_id!: string;
  student_id!: string | null;
  student_group_id!: string | null;
  room_id!: string;
  day!: DayOfWeek;
  startTime!: string;
  endTime!: string;
  status!: SessionStatus;
  createdAt!: string;
  updatedAt!: string;
}
