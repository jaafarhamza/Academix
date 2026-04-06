import "server-only";

import type {
  CourseSessionConflict,
  CourseSessionConflictType,
  CourseSession,
  CourseSessionCreatePayload,
  CourseSessionDay,
  CourseSessionListQuery,
  CourseSessionReschedulePayload,
  CourseSessionStatus,
} from "../types/course-session.types";

const defaultBackendBaseUrl = "http://localhost:3001";
const maxPageSize = 100;

const validDays = new Set<CourseSessionDay>([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

const validStatuses = new Set<CourseSessionStatus>([
  "SCHEDULED",
  "CANCELLED",
  "COMPLETED",
]);

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function getBackendBaseUrl() {
  const value = process.env.API_INTERNAL_BASE_URL?.trim();
  if (value) {
    return normalizeBaseUrl(value);
  }

  return defaultBackendBaseUrl;
}

function buildBackendUrl(path: string) {
  const baseUrl = getBackendBaseUrl();
  const normalizedPath = path.replace(/^\/+/, "");
  return `${baseUrl}/${normalizedPath}`;
}

function parseApiErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Request failed";
  }

  const objectPayload = payload as Record<string, unknown>;
  const message = objectPayload.message;

  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  if (Array.isArray(message)) {
    const firstMessage = message.find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

    if (firstMessage) {
      return firstMessage;
    }
  }

  if (message && typeof message === "object") {
    const nested = (message as Record<string, unknown>).message;

    if (typeof nested === "string" && nested.trim().length > 0) {
      return nested;
    }
  }

  return "Request failed";
}

async function parseResponsePayload(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

type BackendErrorShape = {
  conflicts?: CourseSessionConflict[];
  status: number;
  message: string;
};

export class CourseSessionBackendError extends Error {
  conflicts: CourseSessionConflict[];
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "CourseSessionBackendError";
    this.conflicts = payload.conflicts ?? [];
    this.status = payload.status;
  }
}

function extractCourseSessionConflicts(payload: unknown): CourseSessionConflict[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const objectPayload = payload as Record<string, unknown>;
  const nestedMessage =
    objectPayload.message && typeof objectPayload.message === "object"
      ? (objectPayload.message as Record<string, unknown>)
      : null;
  const conflicts = nestedMessage?.conflicts;

  if (!Array.isArray(conflicts)) {
    return [];
  }

  return conflicts.flatMap((conflict) => {
    if (!conflict || typeof conflict !== "object") {
      return [];
    }

    const conflictRecord = conflict as Record<string, unknown>;
    if (
      typeof conflictRecord.type !== "string" ||
      typeof conflictRecord.message !== "string"
    ) {
      return [];
    }

    const type = conflictRecord.type as CourseSessionConflictType;
    return [
      {
        type,
        message: conflictRecord.message,
      },
    ];
  });
}

function assertIsCourseSessionDay(value: unknown): value is CourseSessionDay {
  return typeof value === "string" && validDays.has(value as CourseSessionDay);
}

function assertIsCourseSessionStatus(value: unknown): value is CourseSessionStatus {
  return (
    typeof value === "string" && validStatuses.has(value as CourseSessionStatus)
  );
}

function assertIsCourseSessionRecord(payload: unknown): asserts payload is CourseSession {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid session payload");
  }

  const value = payload as Record<string, unknown>;

  if (
    typeof value.id !== "string" ||
    typeof value.center_id !== "string" ||
    typeof value.teacher_id !== "string" ||
    typeof value.subject_id !== "string" ||
    (value.student_id !== null && typeof value.student_id !== "string") ||
    (value.student_group_id !== null &&
      typeof value.student_group_id !== "string") ||
    typeof value.room_id !== "string" ||
    !assertIsCourseSessionDay(value.day) ||
    typeof value.startTime !== "string" ||
    typeof value.endTime !== "string" ||
    !assertIsCourseSessionStatus(value.status) ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    throw new Error("Invalid session payload");
  }
}

function assertIsCourseSessionList(payload: unknown): asserts payload is CourseSession[] {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid sessions list payload");
  }

  for (const row of payload) {
    assertIsCourseSessionRecord(row);
  }
}

function buildSessionsQueryString(query: CourseSessionListQuery) {
  const params = new URLSearchParams();

  if (typeof query.teacherId === "string" && query.teacherId.trim().length > 0) {
    params.set("teacher_id", query.teacherId.trim());
  }

  if (
    typeof query.studentGroupId === "string" &&
    query.studentGroupId.trim().length > 0
  ) {
    params.set("student_group_id", query.studentGroupId.trim());
  }

  if (typeof query.roomId === "string" && query.roomId.trim().length > 0) {
    params.set("room_id", query.roomId.trim());
  }

  if (assertIsCourseSessionDay(query.day)) {
    params.set("day", query.day);
  }

  if (assertIsCourseSessionStatus(query.status)) {
    params.set("status", query.status);
  }

  if (
    typeof query.completedFrom === "string" &&
    query.completedFrom.trim().length > 0
  ) {
    params.set("completed_from", query.completedFrom.trim());
  }

  if (typeof query.completedTo === "string" && query.completedTo.trim().length > 0) {
    params.set("completed_to", query.completedTo.trim());
  }

  if (typeof query.page === "number" && Number.isInteger(query.page) && query.page > 0) {
    params.set("page", String(query.page));
  }

  if (typeof query.limit === "number" && Number.isInteger(query.limit) && query.limit > 0) {
    params.set("limit", String(Math.min(query.limit, maxPageSize)));
  }

  const result = params.toString();
  return result.length > 0 ? `?${result}` : "";
}

async function parseBackendResponse<T>(
  response: Response,
  validator: (payload: unknown) => asserts payload is T,
) {
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new CourseSessionBackendError({
      status: response.status,
      conflicts: extractCourseSessionConflicts(payload),
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

export async function getCourseSessionsWithBackend(
  accessToken: string,
  query: CourseSessionListQuery,
): Promise<CourseSession[]> {
  const queryString = buildSessionsQueryString(query);

  const response = await fetch(buildBackendUrl(`sessions${queryString}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsCourseSessionList);
}

function buildCreateSessionRequestBody(payload: CourseSessionCreatePayload) {
  const requestBody: Record<string, string> = {
    teacher_id: payload.teacherId.trim(),
    subject_id: payload.subjectId.trim(),
    room_id: payload.roomId.trim(),
    day: payload.day,
    start_time: payload.startTime.trim(),
    end_time: payload.endTime.trim(),
  };

  if (typeof payload.studentId === "string" && payload.studentId.trim().length > 0) {
    requestBody.student_id = payload.studentId.trim();
  }

  if (
    typeof payload.studentGroupId === "string" &&
    payload.studentGroupId.trim().length > 0
  ) {
    requestBody.student_group_id = payload.studentGroupId.trim();
  }

  return requestBody;
}

export async function createCourseSessionWithBackend(
  accessToken: string,
  payload: CourseSessionCreatePayload,
): Promise<CourseSession> {
  const response = await fetch(buildBackendUrl("sessions"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildCreateSessionRequestBody(payload)),
  });

  return parseBackendResponse(response, assertIsCourseSessionRecord);
}

function buildRescheduleSessionRequestBody(
  payload: CourseSessionReschedulePayload,
) {
  return {
    day: payload.day,
    start_time: payload.startTime.trim(),
    end_time: payload.endTime.trim(),
  };
}

export async function cancelCourseSessionWithBackend(
  accessToken: string,
  sessionId: string,
): Promise<void> {
  const response = await fetch(buildBackendUrl(`sessions/${sessionId.trim()}/cancel`), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new CourseSessionBackendError({
      status: response.status,
      conflicts: extractCourseSessionConflicts(payload),
      message: parseApiErrorMessage(payload),
    });
  }
}

export async function rescheduleCourseSessionWithBackend(
  accessToken: string,
  sessionId: string,
  payload: CourseSessionReschedulePayload,
): Promise<CourseSession> {
  const response = await fetch(
    buildBackendUrl(`sessions/${sessionId.trim()}/reschedule`),
    {
      method: "PATCH",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRescheduleSessionRequestBody(payload)),
    },
  );

  return parseBackendResponse(response, assertIsCourseSessionRecord);
}
