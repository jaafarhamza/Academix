import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DeductionType } from '../../../generated/prisma/enums';
import { CreateCenterCostDto } from './create-center-cost.dto';

describe('CreateCenterCostDto', () => {
  it('accepts a valid global cost payload and normalizes fields', async () => {
    const dto = plainToInstance(CreateCenterCostDto, {
      name: '  Center Commission  ',
      deduction_type: DeductionType.PERCENTAGE_OF_TOTAL,
      value: '12.5',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Center Commission');
    expect(dto.value).toBe(12.5);
    expect(dto.teacher_id).toBeUndefined();
  });

  it('accepts a valid per-teacher payload', async () => {
    const dto = plainToInstance(CreateCenterCostDto, {
      teacher_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      name: 'Teacher override',
      deduction_type: DeductionType.FIXED_PER_STUDENT,
      value: 35,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts zero for percentage-based deductions', async () => {
    const dto = plainToInstance(CreateCenterCostDto, {
      name: 'Zero Percentage',
      deduction_type: DeductionType.PERCENTAGE_PER_STUDENT,
      value: 0,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects percentage-based deductions above 100', async () => {
    const dto = plainToInstance(CreateCenterCostDto, {
      name: 'Too High Percentage',
      deduction_type: DeductionType.PERCENTAGE_OF_TOTAL,
      value: 120,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'value')).toBe(true);
  });

  it('rejects fixed deductions that are not greater than 0', async () => {
    const dto = plainToInstance(CreateCenterCostDto, {
      name: 'Invalid Fixed Rule',
      deduction_type: DeductionType.FIXED_PER_STUDENT,
      value: 0,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'value')).toBe(true);
  });

  it('rejects invalid values', async () => {
    const dto = plainToInstance(CreateCenterCostDto, {
      teacher_id: 'not-a-uuid',
      name: '',
      deduction_type: 'INVALID',
      value: 'abc',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
