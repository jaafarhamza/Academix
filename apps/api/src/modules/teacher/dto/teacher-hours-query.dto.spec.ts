import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  TeacherHoursPeriod,
  TeacherHoursQueryDto,
} from './teacher-hours-query.dto';

describe('TeacherHoursQueryDto', () => {
  it('accepts valid period and trims value', async () => {
    const dto = plainToInstance(TeacherHoursQueryDto, {
      period: ' week ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.period).toBe(TeacherHoursPeriod.WEEK);
  });

  it('defaults to week when query is missing', async () => {
    const dto = plainToInstance(TeacherHoursQueryDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.period).toBe(TeacherHoursPeriod.WEEK);
  });

  it('rejects invalid period', async () => {
    const dto = plainToInstance(TeacherHoursQueryDto, {
      period: 'year',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('period');
  });
});
