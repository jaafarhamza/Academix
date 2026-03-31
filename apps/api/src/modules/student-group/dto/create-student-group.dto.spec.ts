import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateStudentGroupDto } from './create-student-group.dto';

describe('CreateStudentGroupDto', () => {
  it('accepts valid payload and normalizes fields', async () => {
    const dto = plainToInstance(CreateStudentGroupDto, {
      teacherSubjectId: ' f8fce604-79e6-4fa6-a3f0-83fd2e5661d9 ',
      name: '  Group A  ',
      schoolCycle: ' college ',
      schoolYear: ' first_year ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.teacherSubjectId).toBe('f8fce604-79e6-4fa6-a3f0-83fd2e5661d9');
    expect(dto.name).toBe('Group A');
    expect(dto.schoolCycle).toBe('COLLEGE');
    expect(dto.schoolYear).toBe('FIRST_YEAR');
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(CreateStudentGroupDto, {
      teacherSubjectId: 'invalid',
      name: 'A',
      schoolCycle: 'MIDDLE',
      schoolYear: 'YEAR_9',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining([
        'teacherSubjectId',
        'name',
        'schoolCycle',
        'schoolYear',
      ]),
    );
  });
});
