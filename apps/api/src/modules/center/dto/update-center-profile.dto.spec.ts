import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCenterProfileDto } from './update-center-profile.dto';

describe('UpdateCenterProfileDto', () => {
  it('accepts partial valid payload and normalizes fields', async () => {
    const dto = plainToInstance(UpdateCenterProfileDto, {
      firstName: '  Center  ',
      lastName: '  Owner  ',
      centerName: '  Academix Demo Center  ',
      email: '  ADMIN@ACADEMIX-DEMO.COM  ',
      phone: '  +212600000010  ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.firstName).toBe('Center');
    expect(dto.lastName).toBe('Owner');
    expect(dto.centerName).toBe('Academix Demo Center');
    expect(dto.email).toBe('admin@academix-demo.com');
    expect(dto.phone).toBe('+212600000010');
  });

  it('rejects invalid partial payload', async () => {
    const dto = plainToInstance(UpdateCenterProfileDto, {
      firstName: 'A',
      lastName: 'B',
      centerName: 'X',
      email: 'invalid-email',
      phone: '123',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining([
        'firstName',
        'lastName',
        'centerName',
        'email',
        'phone',
      ]),
    );
  });
});
