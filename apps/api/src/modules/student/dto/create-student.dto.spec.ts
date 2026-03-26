import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateStudentDto } from './create-student.dto';

describe('CreateStudentDto', () => {
  const createValidInput = () => ({
    firstName: '  Imane  ',
    lastName: '  Student  ',
    email: '  STUDENT@ACADEMIX-DEMO.COM  ',
    password: 'StrongPass1!',
    phone: '+212600000031',
    parentPhone: '+212600000901',
    schoolName: '  Ibn Sina School  ',
    schoolCycle: 'college',
    schoolYear: 'second_year',
  });

  it('accepts valid payload and normalizes fields', async () => {
    const dto = plainToInstance(CreateStudentDto, createValidInput());
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.firstName).toBe('Imane');
    expect(dto.lastName).toBe('Student');
    expect(dto.email).toBe('student@academix-demo.com');
    expect(dto.schoolName).toBe('Ibn Sina School');
    expect(dto.schoolCycle).toBe('COLLEGE');
    expect(dto.schoolYear).toBe('SECOND_YEAR');
  });

  it('accepts PRIMARY with up to SIXTH_YEAR', async () => {
    const dto = plainToInstance(CreateStudentDto, {
      ...createValidInput(),
      schoolCycle: 'PRIMARY',
      schoolYear: 'SIXTH_YEAR',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.schoolCycle).toBe('PRIMARY');
    expect(dto.schoolYear).toBe('SIXTH_YEAR');
  });

  it('rejects invalid schoolCycle/schoolYear combination', async () => {
    const dto = plainToInstance(CreateStudentDto, {
      ...createValidInput(),
      schoolCycle: 'COLLEGE',
      schoolYear: 'FOURTH_YEAR',
    });

    const errors = await validate(dto);
    const schoolYearError = errors.find(
      (error) => error.property === 'schoolYear',
    );

    expect(schoolYearError).toBeDefined();
    expect(schoolYearError?.constraints).toBeDefined();
    expect(
      Object.values(schoolYearError?.constraints ?? {}).join(' '),
    ).toContain('COLLEGE/LYCEE');
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(CreateStudentDto, {
      firstName: 'A',
      lastName: '',
      email: 'invalid-email',
      password: 'weak',
      phone: '123',
      parentPhone: '123',
      schoolName: '',
      schoolCycle: 'MIDDLE',
      schoolYear: 'YEAR_8',
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
        'parentPhone',
        'schoolName',
        'schoolCycle',
        'schoolYear',
      ]),
    );
  });
});
