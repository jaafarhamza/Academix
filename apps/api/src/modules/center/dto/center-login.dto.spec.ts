import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CenterLoginDto } from './center-login.dto';

describe('CenterLoginDto', () => {
  it('accepts valid payload and normalizes email', async () => {
    const dto = plainToInstance(CenterLoginDto, {
      email: '  ADMIN@ACADEMIX-DEMO.COM  ',
      password: 'Academix.CenterAdmin.2026',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('admin@academix-demo.com');
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(CenterLoginDto, {
      email: 'invalid-email',
      password: 'short',
    });
    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
  });
});
