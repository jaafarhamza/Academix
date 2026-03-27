import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangeCenterPasswordDto } from './change-center-password.dto';

describe('ChangeCenterPasswordDto', () => {
  it('accepts valid password change payload', async () => {
    const dto = plainToInstance(ChangeCenterPasswordDto, {
      currentPassword: 'Academix.CenterAdmin.2026',
      newPassword: 'NewStrongPass1!',
      confirmPassword: 'NewStrongPass1!',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects weak new password and non-matching confirmation', async () => {
    const dto = plainToInstance(ChangeCenterPasswordDto, {
      currentPassword: 'Academix.CenterAdmin.2026',
      newPassword: 'weak',
      confirmPassword: 'different',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining(['newPassword', 'confirmPassword']),
    );
  });
});
