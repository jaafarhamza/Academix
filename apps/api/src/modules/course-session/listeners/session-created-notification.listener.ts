import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { COURSE_SESSION_CREATED_EVENT } from '../constants/course-session.events';
import type { SessionCreatedEventPayload } from '../events/session-created.event';

@Injectable()
export class SessionCreatedNotificationListener {
  private readonly logger = new Logger(SessionCreatedNotificationListener.name);

  @OnEvent(COURSE_SESSION_CREATED_EVENT, {
    async: true,
    suppressErrors: true,
  })
  handleSessionCreated(payload: SessionCreatedEventPayload): void {
    this.logger.debug(
      `session.created received for session ${payload.session_id}`,
    );
  }
}
