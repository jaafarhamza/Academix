import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuerySecretaryDto } from './query-secretary.dto';

describe('QuerySecretaryDto', () => {
  it('accepts valid query values and converts types', async () => {
    const dto = plainToInstance(QuerySecretaryDto, {
      search: '  sara  ',
      isActive: 'true',
      page: '2',
      limit: '25',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('sara');
    expect(dto.isActive).toBe(true);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('parses isActive=false correctly when implicit conversion is enabled', async () => {
    const dto = plainToInstance(
      QuerySecretaryDto,
      { isActive: 'false' },
      { enableImplicitConversion: true },
    );

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.isActive).toBe(false);
  });

  it('rejects invalid query values', async () => {
    const dto = plainToInstance(QuerySecretaryDto, {
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
