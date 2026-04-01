import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DayOfWeek } from '../../../generated/prisma/enums';
import { CreateSessionDto } from './create-session.dto';

describe('CreateSessionDto', () => {
  it('accepts valid snake_case payload and normalizes values', async () => {
    const dto = plainToInstance(CreateSessionDto, {
      teacher_id: ' 20ac2c68-4587-4d78-a053-ef7cd1afaa62 ',
      subject_id: ' 684bb49e-b38e-4ff6-9820-00de8fd0d2ee ',
      student_group_id: ' 343f6d33-80fe-4181-a053-3b059793ec68 ',
      room_id: ' 7178f9b0-76eb-4e4e-bfb0-89d88695f9fd ',
      day: ' mon ',
      start_time: ' 14:00 ',
      end_time: ' 16:00 ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.teacher_id).toBe('20ac2c68-4587-4d78-a053-ef7cd1afaa62');
    expect(dto.subject_id).toBe('684bb49e-b38e-4ff6-9820-00de8fd0d2ee');
    expect(dto.student_group_id).toBe('343f6d33-80fe-4181-a053-3b059793ec68');
    expect(dto.room_id).toBe('7178f9b0-76eb-4e4e-bfb0-89d88695f9fd');
    expect(dto.day).toBe(DayOfWeek.MONDAY);
    expect(dto.start_time).toBe('14:00');
    expect(dto.end_time).toBe('16:00');
  });

  it('rejects invalid ids/day/time and invalid time range', async () => {
    const dto = plainToInstance(CreateSessionDto, {
      teacher_id: 'invalid',
      subject_id: 'invalid',
      student_group_id: 'invalid',
      room_id: 'invalid',
      day: 'XYZ',
      start_time: '16:00',
      end_time: '15:00',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining([
        'teacher_id',
        'subject_id',
        'student_group_id',
        'room_id',
        'day',
        'end_time',
      ]),
    );
  });
});
