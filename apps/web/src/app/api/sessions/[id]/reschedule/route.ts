import { NextRequest, NextResponse } from "next/server";
import {
  CourseSessionBackendError,
  rescheduleCourseSessionWithBackend,
} from "@/modules/course-session/server/course-session.dal";
import type {
  CourseSessionDay,
  CourseSessionReschedulePayload,
} from "@/modules/course-session/types/course-session.types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

function parseDay(value: unknown): CourseSessionDay | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ].includes(normalized)
    ? (normalized as CourseSessionDay)
    : undefined;
}

function parseTimeString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : undefined;
}

function parsePayload(payload: unknown): CourseSessionReschedulePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const day = parseDay(body.day);
  const startTime = parseTimeString(body.startTime);
  const endTime = parseTimeString(body.endTime);

  if (!day || !startTime || !endTime) {
    return null;
  }

  return {
    day,
    startTime,
    endTime,
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json({ message: "Missing bearer token" }, { status: 401 });
    }

    const { id } = await context.params;
    const sessionId = id.trim();
    if (!sessionId) {
      return NextResponse.json({ message: "Invalid session id" }, { status: 400 });
    }

    const payload = await request.json();
    const reschedulePayload = parsePayload(payload);
    if (!reschedulePayload) {
      return NextResponse.json(
        { message: "Invalid session reschedule payload" },
        { status: 400 },
      );
    }

    const session = await rescheduleCourseSessionWithBackend(
      accessToken,
      sessionId,
      reschedulePayload,
    );
    return NextResponse.json(session, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CourseSessionBackendError) {
      return NextResponse.json(
        {
          message: error.message,
          conflicts: error.conflicts,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to reschedule session" },
      { status: 500 },
    );
  }
}
