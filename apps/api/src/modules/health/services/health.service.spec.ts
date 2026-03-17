import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService();
  });

  it('returns API health payload', () => {
    const health = service.getHealth();

    expect(health.status).toBe('ok');
    expect(health.service).toBe('api');
    expect(typeof health.timestamp).toBe('string');
  });
});
