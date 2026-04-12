import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CenterCostScopeFilter,
  QueryCenterCostDto,
} from './query-center-cost.dto';

describe('QueryCenterCostDto', () => {
  it('accepts valid query values and converts pagination types', async () => {
    const dto = plainToInstance(QueryCenterCostDto, {
      scope: ' global ',
      page: '2',
      limit: '25',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.scope).toBe(CenterCostScopeFilter.GLOBAL);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('treats empty pagination values as undefined', async () => {
    const dto = plainToInstance(QueryCenterCostDto, {
      page: '',
      limit: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBeUndefined();
    expect(dto.limit).toBeUndefined();
  });

  it('rejects invalid query values', async () => {
    const dto = plainToInstance(QueryCenterCostDto, {
      scope: 'INVALID',
      page: '0',
      limit: '120',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(expect.arrayContaining(['scope', 'page', 'limit']));
  });
});
