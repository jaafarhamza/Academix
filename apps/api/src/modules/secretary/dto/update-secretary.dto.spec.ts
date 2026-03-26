import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSecretaryDto } from './update-secretary.dto';

describe('UpdateSecretaryDto', () => {
  it('accepts partial valid payload and normalizes fields', async () => {
    const dto = plainToInstance(UpdateSecretaryDto, {
      firstName: '  Sara  ',
      email: '  SECRETARY@ACADEMIX-DEMO.COM  ',
      cin: '  cin-sec-001  ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.firstName).toBe('Sara');
    expect(dto.email).toBe('secretary@academix-demo.com');
    expect(dto.cin).toBe('CIN-SEC-001');
  });

  it('rejects invalid partial payload', async () => {
    const dto = plainToInstance(UpdateSecretaryDto, {
      firstName: 'A',
      email: 'invalid-email',
      phone: '123',
      cin: '***',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining(['firstName', 'email', 'phone', 'cin']),
    );
  });
});
