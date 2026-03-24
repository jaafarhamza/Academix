import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRefreshTokenDto } from './user-refresh-token.dto';

describe('UserRefreshTokenDto', () => {
  it('accepts valid payload and trims refresh token', async () => {
    const dto = plainToInstance(UserRefreshTokenDto, {
      refreshToken: '  refresh-token-value  ',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.refreshToken).toBe('refresh-token-value');
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(UserRefreshTokenDto, {
      refreshToken: '',
    });
    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(expect.arrayContaining(['refreshToken']));
  });
});
