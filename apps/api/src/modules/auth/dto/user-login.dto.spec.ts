import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserLoginDto } from './user-login.dto';

describe('UserLoginDto', () => {
  it('accepts valid payload and normalizes email and center_id', async () => {
    const dto = plainToInstance(UserLoginDto, {
      center_id: ' 2cc4267d-f618-478f-aa2f-9699ecbe332f ',
      email: '  ADMIN@ACADEMIX-DEMO.COM  ',
      password: 'Academix.AdminUser.2026',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.center_id).toBe('2cc4267d-f618-478f-aa2f-9699ecbe332f');
    expect(dto.email).toBe('admin@academix-demo.com');
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(UserLoginDto, {
      center_id: 'invalid-uuid',
      email: 'invalid-email',
      password: 'short',
    });
    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining(['center_id', 'email', 'password']),
    );
  });
});
