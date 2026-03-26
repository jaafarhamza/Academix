import { TeacherService } from './teacher.service';

describe('TeacherService', () => {
  let service: TeacherService;

  beforeEach(() => {
    service = new TeacherService();
  });

  it('returns teacher module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'teacher',
      status: 'ready',
    });
  });
});
