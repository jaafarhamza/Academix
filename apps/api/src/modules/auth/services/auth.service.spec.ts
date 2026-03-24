import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
  });

  it('returns auth module readiness status', () => {
    const status = service.getStatus();

    expect(status).toEqual({
      module: 'auth',
      status: 'ready',
    });
  });
});
