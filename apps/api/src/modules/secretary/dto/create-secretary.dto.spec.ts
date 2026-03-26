import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSecretaryDto } from './create-secretary.dto';

describe('CreateSecretaryDto', () => {
  const createValidInput = () => ({
    firstName: '  Sara  ',
    lastName: '  Secretary  ',
    email: '  SECRETARY@ACADEMIX-DEMO.COM  ',
    password: 'StrongPass1!',
    phone: '+212600000012',
    cin: '  cin-sec-001  ',
  });

  it('accepts valid payload and normalizes fields', async () => {
    const dto = plainToInstance(CreateSecretaryDto, createValidInput());
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.firstName).toBe('Sara');
    expect(dto.lastName).toBe('Secretary');
    expect(dto.email).toBe('secretary@academix-demo.com');
    expect(dto.cin).toBe('CIN-SEC-001');
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(CreateSecretaryDto, {
      firstName: 'A',
      lastName: '',
      email: 'invalid-email',
      password: 'weak',
      phone: '123',
      cin: '***',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining([
        'firstName',
        'lastName',
        'email',
        'password',
        'phone',
        'cin',
      ]),
    );
  });
});
