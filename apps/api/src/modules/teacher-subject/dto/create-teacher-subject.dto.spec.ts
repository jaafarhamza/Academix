import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTeacherSubjectDto } from './create-teacher-subject.dto';

describe('CreateTeacherSubjectDto', () => {
  it('accepts valid payload and normalizes fields', async () => {
    const dto = plainToInstance(CreateTeacherSubjectDto, {
      teacherId: ' 45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f ',
      subjectId: ' 3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16 ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.teacherId).toBe('45fbc49e-83dd-41b8-8c6f-d8f74fc62f8f');
    expect(dto.subjectId).toBe('3b2e0bb2-c5b4-4a7c-a27d-9b743bbefd16');
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(CreateTeacherSubjectDto, {
      teacherId: 'invalid',
      subjectId: 'not-uuid',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(expect.arrayContaining(['teacherId', 'subjectId']));
  });
});
