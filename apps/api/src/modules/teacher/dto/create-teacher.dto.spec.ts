import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTeacherDto } from './create-teacher.dto';

describe('CreateTeacherDto', () => {
  const createValidInput = () => ({
    firstName: '  Fatima  ',
    lastName: '  Zahraoui  ',
    email: '  TEACHER@ACADEMIX-DEMO.COM  ',
    password: 'StrongPass1!',
    phone: '+212600000030',
    cin: '  be-12345  ',
    hourlyRate: '150.5',
    maxHoursPerWeek: '24',
  });

  it('accepts valid payload and normalizes fields', async () => {
    const dto = plainToInstance(CreateTeacherDto, createValidInput());
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.firstName).toBe('Fatima');
    expect(dto.lastName).toBe('Zahraoui');
    expect(dto.email).toBe('teacher@academix-demo.com');
    expect(dto.cin).toBe('BE-12345');
    expect(dto.hourlyRate).toBe(150.5);
    expect(dto.maxHoursPerWeek).toBe(24);
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(CreateTeacherDto, {
      firstName: 'A',
      lastName: '',
      email: 'invalid-email',
      password: 'weak',
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
        'lastName',
        'email',
        'password',
        'phone',
        'cin',
        'hourlyRate',
        'maxHoursPerWeek',
      ]),
    );
  });
});
