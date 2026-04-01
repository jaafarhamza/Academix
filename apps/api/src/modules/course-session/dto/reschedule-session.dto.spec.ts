import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DayOfWeek } from '../../../generated/prisma/enums';
import { RescheduleSessionDto } from './reschedule-session.dto';

describe('RescheduleSessionDto', () => {
  it('accepts valid payload and normalizes values', async () => {
    const dto = plainToInstance(RescheduleSessionDto, {
      day: ' wed ',
      start_time: ' 13:00 ',
      end_time: ' 14:00 ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.day).toBe(DayOfWeek.WEDNESDAY);
    expect(dto.start_time).toBe('13:00');
    expect(dto.end_time).toBe('14:00');
  });

  it('rejects invalid day/time and invalid time range', async () => {
    const dto = plainToInstance(RescheduleSessionDto, {
      day: 'XYZ',
      start_time: '16:00',
      end_time: '15:00',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(expect.arrayContaining(['day', 'end_time']));
  });
});
