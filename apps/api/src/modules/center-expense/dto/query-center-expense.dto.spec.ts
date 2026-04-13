import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryCenterExpenseDto } from './query-center-expense.dto';

describe('QueryCenterExpenseDto', () => {
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
});
