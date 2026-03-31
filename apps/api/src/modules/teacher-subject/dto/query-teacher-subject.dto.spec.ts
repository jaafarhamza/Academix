import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryTeacherSubjectDto } from './query-teacher-subject.dto';

describe('QueryTeacherSubjectDto', () => {
  it('accepts valid query values and converts types', async () => {
    const dto = plainToInstance(QueryTeacherSubjectDto, {
      teacherId: ' 45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f ',
      subjectId: ' 3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16 ',
      page: '2',
      limit: '25',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.teacherId).toBe('45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f');
    expect(dto.subjectId).toBe('3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16');
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('rejects invalid query values', async () => {
    const dto = plainToInstance(QueryTeacherSubjectDto, {
      teacherId: 'invalid',
      subjectId: 'not-uuid',
      page: '0',
      limit: '200',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining(['teacherId', 'subjectId', 'page', 'limit']),
    );
  });
});
