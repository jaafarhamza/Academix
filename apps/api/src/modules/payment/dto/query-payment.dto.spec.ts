import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaymentStatus } from '../../../generated/prisma/enums';
import { QueryPaymentDto } from './query-payment.dto';

describe('QueryPaymentDto', () => {
  it('accepts valid query values and converts pagination types', async () => {
    const dto = plainToInstance(QueryPaymentDto, {
      student_id: ' 20ac2c68-4587-4d78-a053-ef7cd1afaa62 ',
      teacher_id: ' 343f6d33-80fe-4181-a053-3b059793ec68 ',
      student_group_id: ' 7178f9b0-76eb-4e4e-bfb0-89d88695f9fd ',
      status: PaymentStatus.PARTIALLY_PAID,
      payment_from: ' 2026-04-01T00:00:00.000Z ',
      payment_to: ' 2026-04-30T23:59:59.999Z ',
      page: '2',
      limit: '25',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.student_id).toBe('20ac2c68-4587-4d78-a053-ef7cd1afaa62');
    expect(dto.teacher_id).toBe('343f6d33-80fe-4181-a053-3b059793ec68');
    expect(dto.student_group_id).toBe('7178f9b0-76eb-4e4e-bfb0-89d88695f9fd');
    expect(dto.status).toBe(PaymentStatus.PARTIALLY_PAID);
    expect(dto.payment_from).toBe('2026-04-01T00:00:00.000Z');
    expect(dto.payment_to).toBe('2026-04-30T23:59:59.999Z');
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('treats empty pagination values as undefined', async () => {
    const dto = plainToInstance(QueryPaymentDto, {
      page: '',
      limit: '',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBeUndefined();
    expect(dto.limit).toBeUndefined();
  });

  it('rejects invalid query values', async () => {
    const dto = plainToInstance(QueryPaymentDto, {
      student_id: 'invalid-id',
      teacher_id: 'invalid-id',
      student_group_id: 'invalid-id',
      status: 'PENDING' as unknown,
      payment_from: 'not-a-date',
      page: '0',
      limit: '120',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining([
        'student_id',
        'teacher_id',
        'student_group_id',
        'status',
        'payment_from',
        'page',
        'limit',
      ]),
    );
  });
});
