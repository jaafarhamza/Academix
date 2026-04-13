import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCenterExpenseDto } from './update-center-expense.dto';

describe('UpdateCenterExpenseDto', () => {
  it('accepts partial updates', async () => {
    const dto = plainToInstance(UpdateCenterExpenseDto, {
      amount: '80.25',
      description: '  Updated expense description  ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto).toEqual({
      amount: 80.25,
      description: 'Updated expense description',
    });
  });

  it('rejects invalid user ids', async () => {
    const dto = plainToInstance(UpdateCenterExpenseDto, {
      user_id: 'invalid-id',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('user_id');
  });
});
