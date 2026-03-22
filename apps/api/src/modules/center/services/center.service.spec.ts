import { CenterService } from './center.service';

describe('CenterService', () => {
  let service: CenterService;

  beforeEach(() => {
    service = new CenterService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
