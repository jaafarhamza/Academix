import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRolePermissionDto } from './create-role-permission.dto';

describe('CreateRolePermissionDto', () => {
  it('accepts valid payload', async () => {
    const dto = plainToInstance(CreateRolePermissionDto, {
      role: 'SECRETARY',
      permission: 'MANAGE_USERS',
      isGranted: true,
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(CreateRolePermissionDto, {
      role: 'UNKNOWN_ROLE',
      permission: 'UNKNOWN_PERMISSION',
      isGranted: 'yes',
    });
    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining(['role', 'permission', 'isGranted']),
    );
  });
});
