import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryEnrollmentDto } from './query-enrollment.dto';

describe('QueryEnrollmentDto', () => {
  it('accepts valid payload and normalizes fields', async () => {
    const dto = plainToInstance(QueryEnrollmentDto, {
      studentId: ' 45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f ',
      studentGroupId: ' 3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16 ',
      isActive: 'true',
      page: '2',
      limit: '10',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.studentId).toBe('45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f');
    expect(dto.studentGroupId).toBe('3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16');
    expect(dto.isActive).toBe(true);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });

  it('accepts false boolean filter for isActive', async () => {
    const dto = plainToInstance(QueryEnrollmentDto, {
      isActive: 'false',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.isActive).toBe(false);
  });

  it('accepts empty payload', async () => {
    const dto = plainToInstance(QueryEnrollmentDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(QueryEnrollmentDto, {
      studentId: 'invalid',
      studentGroupId: 'invalid',
      isActive: 'yes',
      page: '0',
      limit: '101',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining([
        'studentId',
        'studentGroupId',
        'isActive',
        'page',
        'limit',
      ]),
    );
  });
});
