import { TeacherHoursPeriod } from './teacher-hours-query.dto';

export class TeacherHoursResponseDto {
  teacher_id!: string;
  center_id!: string;
  period!: TeacherHoursPeriod;
  hours!: number;
}
