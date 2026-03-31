import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryRoomDto } from './query-room.dto';

describe('QueryRoomDto', () => {
  it('accepts valid query values and converts types', async () => {
    const dto = plainToInstance(QueryRoomDto, {
      search: '  B2  ',
      floor: '2',
      isAvailable: 'true',
      page: '2',
      limit: '25',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('B2');
    expect(dto.floor).toBe(2);
    expect(dto.isAvailable).toBe(true);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('treats empty optional values as undefined where applicable', async () => {
    const dto = plainToInstance(QueryRoomDto, {
      search: '   ',
      floor: '',
      isAvailable: '',
      page: '',
      limit: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('');
    expect(dto.floor).toBeUndefined();
    expect(dto.isAvailable).toBeUndefined();
    expect(dto.page).toBeUndefined();
    expect(dto.limit).toBeUndefined();
  });

  it('rejects invalid query values', async () => {
    const dto = plainToInstance(QueryRoomDto, {
      floor: '-1',
      isAvailable: 'x',
      page: '0',
      limit: '101',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining(['floor', 'isAvailable', 'page', 'limit']),
    );
  });
});
