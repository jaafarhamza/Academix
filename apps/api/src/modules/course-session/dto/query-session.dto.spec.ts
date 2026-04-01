import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DayOfWeek, SessionStatus } from '../../../generated/prisma/enums';
import { QuerySessionDto } from './query-session.dto';

describe('QuerySessionDto', () => {
  it('accepts valid query values and converts pagination types', async () => {
    const dto = plainToInstance(QuerySessionDto, {
      teacher_id: ' 20ac2c68-4587-4d78-a053-ef7cd1afaa62 ',
      student_group_id: ' 343f6d33-80fe-4181-a053-3b059793ec68 ',
      room_id: ' 7178f9b0-76eb-4e4e-bfb0-89d88695f9fd ',
      day: DayOfWeek.MONDAY,
      status: SessionStatus.SCHEDULED,
      page: '2',
      limit: '25',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.teacher_id).toBe('20ac2c68-4587-4d78-a053-ef7cd1afaa62');
    expect(dto.student_group_id).toBe('343f6d33-80fe-4181-a053-3b059793ec68');
    expect(dto.room_id).toBe('7178f9b0-76eb-4e4e-bfb0-89d88695f9fd');
    expect(dto.day).toBe(DayOfWeek.MONDAY);
    expect(dto.status).toBe(SessionStatus.SCHEDULED);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('treats empty pagination values as undefined', async () => {
    const dto = plainToInstance(QuerySessionDto, {
      page: '',
      limit: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBeUndefined();
    expect(dto.limit).toBeUndefined();
  });

  it('rejects invalid query values', async () => {
    const dto = plainToInstance(QuerySessionDto, {
      teacher_id: 'invalid-id',
      day: 'MON' as unknown,
      status: 'PENDING' as unknown,
      page: '0',
      limit: '120',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining(['teacher_id', 'day', 'status', 'page', 'limit']),
    );
  });
});
