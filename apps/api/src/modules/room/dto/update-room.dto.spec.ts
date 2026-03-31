import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateRoomDto } from './update-room.dto';

describe('UpdateRoomDto', () => {
  it('accepts partial valid payload and normalizes fields', async () => {
    const dto = plainToInstance(UpdateRoomDto, {
      floor: 5,
      roomName: '  Room E1  ',
      isAvailable: 'true',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.floor).toBe(5);
    expect(dto.roomName).toBe('Room E1');
    expect(dto.isAvailable).toBe(true);
  });

  it('rejects invalid partial payload', async () => {
    const dto = plainToInstance(UpdateRoomDto, {
      floor: -3,
      roomName: 'x'.repeat(81),
      isAvailable: 'invalid',
    });

    const errors = await validate(dto);
    const fields = errors.map((error) => error.property);

    expect(fields).toEqual(
      expect.arrayContaining(['floor', 'roomName', 'isAvailable']),
    );
  });
});
