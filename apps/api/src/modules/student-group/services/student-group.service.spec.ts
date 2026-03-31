import { StudentGroupService } from './student-group.service';

describe('StudentGroupService', () => {
  let service: StudentGroupService;

  beforeEach(() => {
    service = new StudentGroupService();
  });

  it('returns ready status', () => {
    expect(service.getStatus()).toEqual({
      module: 'student-group',
      status: 'ready',
    });
  });
});
