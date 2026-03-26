import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateStudentDto } from './update-student.dto';

describe('UpdateStudentDto', () => {
  it('accepts partial valid payload and normalizes fields', async () => {
    const dto = plainToInstance(UpdateStudentDto, {
      firstName: '  Imane  ',
      email: '  STUDENT@ACADEMIX-DEMO.COM  ',
      parentPhone: '  +212600000901  ',
      schoolCycle: 'college',
      schoolYear: 'second_year',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.firstName).toBe('Imane');
    expect(dto.email).toBe('student@academix-demo.com');
    expect(dto.parentPhone).toBe('+212600000901');
    expect(dto.schoolCycle).toBe('COLLEGE');
    expect(dto.schoolYear).toBe('SECOND_YEAR');
  });

  it('rejects invalid partial payload', async () => {
    const dto = plainToInstance(UpdateStudentDto, {
      firstName: 'A',
      email: 'invalid-email',
      phone: '123',
      parentPhone: 'abcd',
      schoolCycle: 'MIDDLE',
      schoolYear: 'YEAR_8',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining([
        'firstName',
        'email',
        'phone',
        'parentPhone',
        'schoolCycle',
        'schoolYear',
      ]),
    );
  });
});
