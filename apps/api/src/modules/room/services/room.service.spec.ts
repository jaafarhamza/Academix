import { RoomService } from './room.service';

describe('RoomService', () => {
  let service: RoomService;

  beforeEach(() => {
    service = new RoomService();
  });

  it('returns room module ready status', () => {
    const result = service.getStatus();

    expect(result).toEqual({
      module: 'room',
      status: 'ready',
    });
  });
});
