import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TeacherIncomeQueryDto } from './teacher-income-query.dto';

describe('TeacherIncomeQueryDto', () => {
  it('accepts valid month and trims value', async () => {
    const dto = plainToInstance(TeacherIncomeQueryDto, {
      month: ' 2026-02 ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.month).toBe('2026-02');
  });

  it('allows empty query', async () => {
    const dto = plainToInstance(TeacherIncomeQueryDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.month).toBeUndefined();
  });

  it('rejects invalid month format', async () => {
    const dto = plainToInstance(TeacherIncomeQueryDto, {
      month: '2026/02',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('month');
  });
});
