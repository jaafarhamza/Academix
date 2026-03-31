import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSubjectDto } from './create-subject.dto';

describe('CreateSubjectDto', () => {
  it('accepts valid payload and normalizes fields', async () => {
    const dto = plainToInstance(CreateSubjectDto, {
      name: '  Mathematics  ',
      description: '  Core mathematics program for middle school  ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Mathematics');
    expect(dto.description).toBe('Core mathematics program for middle school');
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(CreateSubjectDto, {
      name: 'A',
      description: 'no',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(expect.arrayContaining(['name', 'description']));
  });
});
