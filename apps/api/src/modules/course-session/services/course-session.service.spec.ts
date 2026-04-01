import { CourseSessionService } from './course-session.service';

describe('CourseSessionService', () => {
  let service: CourseSessionService;

  beforeEach(() => {
    service = new CourseSessionService();
  });

  it('returns course-session module ready status', () => {
    const result = service.getStatus();

    expect(result).toEqual({
      module: 'course-session',
      status: 'ready',
    });
  });
});
