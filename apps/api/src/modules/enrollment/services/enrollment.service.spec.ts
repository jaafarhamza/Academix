import { EnrollmentService } from './enrollment.service';

describe('EnrollmentService', () => {
  let service: EnrollmentService;

  beforeEach(() => {
    service = new EnrollmentService();
  });

  it('returns ready status', () => {
    expect(service.getStatus()).toEqual({
      module: 'enrollment',
      status: 'ready',
    });
  });
});
