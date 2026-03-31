import { DayOfWeek } from '../../../generated/prisma/enums';

export class RoomBookingResponseDto {
  room_id!: string;
  day!: DayOfWeek;
  start!: string;
  end!: string;
  isBooked!: boolean;
  conflictingSessions!: number;
}
