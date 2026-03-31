import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSubjectDto } from './update-subject.dto';

describe('UpdateSubjectDto', () => {
  it('accepts partial valid payload and normalizes fields', async () => {
    const dto = plainToInstance(UpdateSubjectDto, {
      name: '  Advanced Mathematics  ',
      description: '  Updated description for level 2  ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Advanced Mathematics');
    expect(dto.description).toBe('Updated description for level 2');
  });

  it('rejects invalid partial payload', async () => {
    const dto = plainToInstance(UpdateSubjectDto, {
      name: 'A',
      description: 'x',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(expect.arrayContaining(['name', 'description']));
  });
});
