import { DayOfWeek, SessionStatus } from '../../../generated/prisma/enums';
import { SessionCreatedNotificationListener } from './session-created-notification.listener';

describe('SessionCreatedNotificationListener', () => {
  it('handles session.created payload without throwing', () => {
    const listener = new SessionCreatedNotificationListener();

    expect(() =>
      listener.handleSessionCreated({
        session_id: 'session-1',
        center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        teacher_id: '20ac2c68-4587-4d78-a053-ef7cd1afaa62',
        subject_id: '684bb49e-b38e-4ff6-9820-00de8fd0d2ee',
        student_id: null,
        student_group_id: '343f6d33-80fe-4181-a053-3b059793ec68',
        room_id: '7178f9b0-76eb-4e4e-bfb0-89d88695f9fd',
        day: DayOfWeek.MONDAY,
        start_time: '14:00',
        end_time: '16:00',
        status: SessionStatus.SCHEDULED,
        created_at: '2026-04-01T10:00:00.000Z',
      }),
    ).not.toThrow();
  });
});
