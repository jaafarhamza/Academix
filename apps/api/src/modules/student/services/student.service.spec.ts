import { StudentService } from './student.service';

describe('StudentService', () => {
  let service: StudentService;

  beforeEach(() => {
    service = new StudentService();
  });

  it('returns student module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'student',
      status: 'ready',
    });
  });
});
