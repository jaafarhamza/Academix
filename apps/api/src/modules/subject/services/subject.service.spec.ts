import { SubjectService } from './subject.service';

describe('SubjectService', () => {
  let service: SubjectService;

  beforeEach(() => {
    service = new SubjectService();
  });

  it('returns ready status', () => {
    expect(service.getStatus()).toEqual({
      module: 'subject',
      status: 'ready',
    });
  });
});
