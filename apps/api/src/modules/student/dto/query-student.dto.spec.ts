import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryStudentDto } from './query-student.dto';

describe('QueryStudentDto', () => {
  it('accepts valid query values and converts types', async () => {
    const dto = plainToInstance(QueryStudentDto, {
      search: '  imane  ',
      groupId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      schoolCycle: 'college',
      schoolYear: 'second_year',
      isActive: 'true',
      page: '2',
      limit: '25',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('imane');
    expect(dto.groupId).toBe('2cc4267d-f618-478f-aa2f-9699ecbe332f');
    expect(dto.schoolCycle).toBe('COLLEGE');
    expect(dto.schoolYear).toBe('SECOND_YEAR');
    expect(dto.isActive).toBe(true);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('parses isActive=false correctly when implicit conversion is enabled', async () => {
    const dto = plainToInstance(
      QueryStudentDto,
      { isActive: 'false' },
      { enableImplicitConversion: true },
    );

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.isActive).toBe(false);
  });

  it('rejects invalid query values', async () => {
    const dto = plainToInstance(QueryStudentDto, {
      groupId: 'not-a-uuid',
      schoolCycle: 'MIDDLE',
      schoolYear: 'YEAR_8',
      isActive: 'maybe',
      page: '0',
      limit: '200',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining([
        'groupId',
        'schoolCycle',
        'schoolYear',
        'isActive',
        'page',
        'limit',
      ]),
    );
  });
});
