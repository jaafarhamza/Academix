import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuerySubjectDto } from './query-subject.dto';

describe('QuerySubjectDto', () => {
  it('accepts valid query values and converts types', async () => {
    const dto = plainToInstance(QuerySubjectDto, {
      search: '  math  ',
      page: '2',
      limit: '25',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('math');
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('treats empty query values as undefined', async () => {
    const dto = plainToInstance(QuerySubjectDto, {
      search: '   ',
      page: '',
      limit: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('');
    expect(dto.page).toBeUndefined();
    expect(dto.limit).toBeUndefined();
  });

  it('rejects invalid query values', async () => {
    const dto = plainToInstance(QuerySubjectDto, {
      page: '0',
      limit: '200',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(expect.arrayContaining(['page', 'limit']));
  });
});
