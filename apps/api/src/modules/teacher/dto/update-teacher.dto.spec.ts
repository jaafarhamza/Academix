import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateTeacherDto } from './update-teacher.dto';

describe('UpdateTeacherDto', () => {
  it('accepts partial valid payload and normalizes fields', async () => {
    const dto = plainToInstance(UpdateTeacherDto, {
      firstName: '  Fatima  ',
      email: '  TEACHER@ACADEMIX-DEMO.COM  ',
      cin: '  be-12345  ',
      hourlyRate: '150.5',
      maxHoursPerWeek: null,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.firstName).toBe('Fatima');
    expect(dto.email).toBe('teacher@academix-demo.com');
    expect(dto.cin).toBe('BE-12345');
    expect(dto.hourlyRate).toBe(150.5);
    expect(dto.maxHoursPerWeek).toBeNull();
  });

  it('rejects invalid partial payload', async () => {
    const dto = plainToInstance(UpdateTeacherDto, {
      firstName: 'A',
      email: 'invalid-email',
      phone: '123',
      cin: '***',
      hourlyRate: 'invalid-number',
      maxHoursPerWeek: 200,
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining([
        'firstName',
        'email',
        'phone',
        'cin',
        'hourlyRate',
        'maxHoursPerWeek',
      ]),
    );
  });
});
