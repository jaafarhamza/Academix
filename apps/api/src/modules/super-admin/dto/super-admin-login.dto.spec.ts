import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SuperAdminLoginDto } from './super-admin-login.dto';

describe('SuperAdminLoginDto', () => {
  it('accepts valid payload', async () => {
    const dto = plainToInstance(SuperAdminLoginDto, {
      email: 'superadmin@academix.com',
      password: 'Academix.SuperAdmin.2026',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(SuperAdminLoginDto, {
      email: 'invalid-email',
      password: 'short',
    });
    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
  });
});
