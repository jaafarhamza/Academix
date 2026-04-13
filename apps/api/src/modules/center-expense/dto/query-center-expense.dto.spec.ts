import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryCenterExpenseDto } from './query-center-expense.dto';

describe('QueryCenterExpenseDto', () => {
  it('accepts user_id and month filters', async () => {
    const dto = plainToInstance(QueryCenterExpenseDto, {
      user_id: 'd3d716e5-7d8a-44cf-824c-b53f437d6771',
      month: '2026-04',
      page: '1',
      limit: '20',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.user_id).toBe('d3d716e5-7d8a-44cf-824c-b53f437d6771');
    expect(dto.month).toBe('2026-04');
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('transforms pagination values from strings', async () => {
    const dto = plainToInstance(QueryCenterExpenseDto, {
      page: '2',
      limit: '15',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(15);
  });

  it('allows empty pagination values', async () => {
    const dto = plainToInstance(QueryCenterExpenseDto, {
      page: '',
      limit: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBeUndefined();
    expect(dto.limit).toBeUndefined();
  });

  it('rejects invalid user_id and month formats', async () => {
    const dto = plainToInstance(QueryCenterExpenseDto, {
      user_id: 'teacher-1',
      month: '2026-13',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(2);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['user_id', 'month']),
    );
  });
});
