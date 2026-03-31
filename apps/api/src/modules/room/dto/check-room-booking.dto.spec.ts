import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DayOfWeek } from '../../../generated/prisma/enums';
import { CheckRoomBookingDto } from './check-room-booking.dto';

describe('CheckRoomBookingDto', () => {
  it('accepts full and short day values and normalizes them to DayOfWeek', async () => {
    const shortDto = plainToInstance(CheckRoomBookingDto, {
      day: 'mon',
      start: '14:00',
      end: '16:00',
    });
    const fullDto = plainToInstance(CheckRoomBookingDto, {
      day: 'TUESDAY',
      start: '09:30',
      end: '10:30',
    });

    const shortErrors = await validate(shortDto);
    const fullErrors = await validate(fullDto);

    expect(shortErrors).toHaveLength(0);
    expect(fullErrors).toHaveLength(0);
    expect(shortDto.day).toBe(DayOfWeek.MONDAY);
    expect(fullDto.day).toBe(DayOfWeek.TUESDAY);
  });

  it('rejects invalid day and invalid time formats', async () => {
    const dto = plainToInstance(CheckRoomBookingDto, {
      day: 'XYZ',
      start: '9:00',
      end: '25:00',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(expect.arrayContaining(['day', 'start', 'end']));
  });
});
