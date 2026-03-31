import { TeacherSubjectService } from './teacher-subject.service';

describe('TeacherSubjectService', () => {
  let service: TeacherSubjectService;

  beforeEach(() => {
    service = new TeacherSubjectService();
  });

  it('returns ready status', () => {
    expect(service.getStatus()).toEqual({
      module: 'teacher-subject',
      status: 'ready',
    });
  });
});
