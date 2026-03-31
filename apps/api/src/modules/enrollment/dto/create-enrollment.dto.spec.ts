import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEnrollmentDto } from './create-enrollment.dto';

describe('CreateEnrollmentDto', () => {
  it('accepts valid payload and normalizes fields', async () => {
    const dto = plainToInstance(CreateEnrollmentDto, {
      studentId: ' 45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f ',
      studentGroupId: ' 3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16 ',
      enrollmentDate: ' 2026-04-01 ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.studentId).toBe('45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f');
    expect(dto.studentGroupId).toBe('3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16');
    expect(dto.enrollmentDate).toBe('2026-04-01');
  });

  it('accepts payload without enrollmentDate', async () => {
    const dto = plainToInstance(CreateEnrollmentDto, {
      studentId: '45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f',
      studentGroupId: '3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.enrollmentDate).toBeUndefined();
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(CreateEnrollmentDto, {
      studentId: 'invalid',
      studentGroupId: 'invalid',
      enrollmentDate: 'not-a-date',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining(['studentId', 'studentGroupId', 'enrollmentDate']),
    );
  });
});
