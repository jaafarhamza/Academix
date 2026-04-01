import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  COURSE_SESSION_CANCELLED_EVENT,
  COURSE_SESSION_CREATED_EVENT,
  COURSE_SESSION_RESCHEDULED_EVENT,
} from '../constants/course-session.events';
import type { SessionCancelledEventPayload } from '../events/session-cancelled.event';
import type { SessionCreatedEventPayload } from '../events/session-created.event';
import type { SessionRescheduledEventPayload } from '../events/session-rescheduled.event';

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

  @OnEvent(COURSE_SESSION_CANCELLED_EVENT, {
    async: true,
    suppressErrors: true,
  })
  handleSessionCancelled(payload: SessionCancelledEventPayload): void {
    this.logger.debug(
      `session.cancelled received for session ${payload.session_id}`,
    );
  }

  @OnEvent(COURSE_SESSION_RESCHEDULED_EVENT, {
    async: true,
    suppressErrors: true,
  })
  handleSessionRescheduled(payload: SessionRescheduledEventPayload): void {
    this.logger.debug(
      `session.rescheduled received for session ${payload.session_id}`,
    );
  }
}
