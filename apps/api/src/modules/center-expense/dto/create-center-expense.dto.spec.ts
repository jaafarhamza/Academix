import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCenterExpenseDto } from './create-center-expense.dto';

describe('CreateCenterExpenseDto', () => {
  it('accepts a valid payload', async () => {
    const dto = plainToInstance(CreateCenterExpenseDto, {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: '125.5',
      description: '  Travel reimbursement for exam materials  ',
      date: '2026-04-13',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto).toEqual({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 125.5,
      description: 'Travel reimbursement for exam materials',
      date: '2026-04-13',
    });
  });

  it('rejects non-positive amounts', async () => {
    const dto = plainToInstance(CreateCenterExpenseDto, {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 0,
      description: 'Travel reimbursement',
      date: '2026-04-13',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('amount');
  });

  it('rejects invalid dates', async () => {
    const dto = plainToInstance(CreateCenterExpenseDto, {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 25,
      description: 'Travel reimbursement',
      date: '13-04-2026',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('date');
  });
});
