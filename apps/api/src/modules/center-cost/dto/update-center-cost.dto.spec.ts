import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DeductionType } from '../../../generated/prisma/enums';
import { UpdateCenterCostDto } from './update-center-cost.dto';

describe('UpdateCenterCostDto', () => {
  it('accepts partial payload fields', async () => {
    const payload = plainToInstance(UpdateCenterCostDto, {
      name: '  Updated Center Commission  ',
      value: '12.5',
    });

    const errors = await validate(payload);

    expect(errors).toHaveLength(0);
    expect(payload).toEqual({
      name: 'Updated Center Commission',
      value: 12.5,
    });
  });

  it('allows clearing teacher_id to null', async () => {
    const payload = plainToInstance(UpdateCenterCostDto, {
      teacher_id: '',
      deduction_type: DeductionType.PERCENTAGE_OF_TOTAL,
    });

    const errors = await validate(payload);

    expect(errors).toHaveLength(0);
    expect(payload.teacher_id).toBeNull();
  });

  it('rejects invalid teacher_id when provided', async () => {
    const payload = plainToInstance(UpdateCenterCostDto, {
      teacher_id: 'invalid-id',
    });

    const errors = await validate(payload);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('teacher_id');
  });

  it('rejects invalid deduction_type values', async () => {
    const payload = plainToInstance(UpdateCenterCostDto, {
      deduction_type: 'INVALID_TYPE',
    });

    const errors = await validate(payload);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('deduction_type');
  });
});
