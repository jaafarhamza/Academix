import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryStudentGroupDto } from './query-student-group.dto';

describe('QueryStudentGroupDto', () => {
  it('accepts valid query values and converts types', async () => {
    const dto = plainToInstance(QueryStudentGroupDto, {
      schoolCycle: 'college',
      schoolYear: 'second_year',
      teacherId: ' 45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f ',
      subjectId: ' 3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16 ',
      page: '2',
      limit: '25',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.schoolCycle).toBe('COLLEGE');
    expect(dto.schoolYear).toBe('SECOND_YEAR');
    expect(dto.teacherId).toBe('45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f');
    expect(dto.subjectId).toBe('3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16');
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('rejects invalid query values', async () => {
    const dto = plainToInstance(QueryStudentGroupDto, {
      schoolCycle: 'MIDDLE',
      schoolYear: 'YEAR_8',
      teacherId: 'invalid',
      subjectId: 'not-uuid',
      page: '0',
      limit: '200',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining([
        'schoolCycle',
        'schoolYear',
        'teacherId',
        'subjectId',
        'page',
        'limit',
      ]),
    );
  });
});
