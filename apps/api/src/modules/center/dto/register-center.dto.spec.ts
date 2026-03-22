import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterCenterDto } from './register-center.dto';

describe('RegisterCenterDto', () => {
  const createValidInput = () => ({
    firstName: '  Center  ',
    lastName: '  Owner  ',
    centerName: '  Academix Demo Center  ',
    email: '  ADMIN@ACADEMIX-DEMO.COM  ',
    password: 'StrongPass1!',
    phone: '+212600000010',
    logoUrl: 'https://example.com/logo.png',
  });

  it('accepts valid payload and normalizes string fields', async () => {
    const dto = plainToInstance(RegisterCenterDto, createValidInput());
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.firstName).toBe('Center');
    expect(dto.lastName).toBe('Owner');
    expect(dto.centerName).toBe('Academix Demo Center');
    expect(dto.email).toBe('admin@academix-demo.com');
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(RegisterCenterDto, {
      firstName: 'A',
      lastName: '',
      centerName: 'X',
      email: 'invalid-email',
      password: 'weak',
      phone: '123',
      logoUrl: 'not-a-url',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining([
        'firstName',
        'lastName',
        'centerName',
        'email',
        'password',
        'phone',
        'logoUrl',
      ]),
    );
  });
});
