import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryTeacherDto } from './query-teacher.dto';

describe('QueryTeacherDto', () => {
  it('accepts valid query values and converts types', async () => {
    const dto = plainToInstance(QueryTeacherDto, {
      search: '  fatima  ',
      isActive: 'true',
      page: '2',
      limit: '25',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('fatima');
    expect(dto.isActive).toBe(true);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('rejects invalid query values', async () => {
    const dto = plainToInstance(QueryTeacherDto, {
      isActive: 'maybe',
      page: '0',
      limit: '200',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining(['isActive', 'page', 'limit']),
    );
  });
});
