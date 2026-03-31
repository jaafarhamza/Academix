import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRoomDto } from './create-room.dto';

describe('CreateRoomDto', () => {
  it('accepts valid payload and normalizes roomName', async () => {
    const dto = plainToInstance(CreateRoomDto, {
      floor: 2,
      roomName: '  Room B2  ',
      isAvailable: 'false',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.floor).toBe(2);
    expect(dto.roomName).toBe('Room B2');
    expect(dto.isAvailable).toBe(false);
  });

  it('rejects invalid payload', async () => {
    const dto = plainToInstance(CreateRoomDto, {
      floor: -1,
      roomName: '   ',
      isAvailable: 'not-boolean',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining(['floor', 'roomName', 'isAvailable']),
    );
  });
});
