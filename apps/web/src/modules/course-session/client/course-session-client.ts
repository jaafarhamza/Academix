"use client";

import {
  getCurrentCenterAccessToken,
  refreshCenterSession,
} from "@/modules/center/client/center-auth-client";
import type {
  CourseSession,
  CourseSessionCreatePayload,
  CourseSessionDay,
  CourseSessionListQuery,
  CourseSessionStatus,
} from "../types/course-session.types";

const sessionsApiBasePath = "/api/sessions";
const maxPageSize = 100;
const ongoingCourseSessionListRequests = new Map<string, Promise<CourseSession[]>>();

const dayValues = new Set<CourseSessionDay>([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

const statusValues = new Set<CourseSessionStatus>([
  "SCHEDULED",
  "CANCELLED",
  "COMPLETED",
]);

function extractMessageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeMessage = (payload as Record<string, unknown>).message;
  if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
    return maybeMessage;
  }

  if (Array.isArray(maybeMessage)) {
    const firstMessage = maybeMessage.find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

    if (firstMessage) {
      return firstMessage;
    }
  }

  return null;
}

async function parseJsonResponse(response: Response) {
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

async function parseSessionsApiResponse<T>(
  response: Response,
  fallbackMessage: string,
) {
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(extractMessageFromPayload(payload) ?? fallbackMessage);
  }

  return payload as T;
}

async function getRequiredCenterAccessToken() {
  const existingToken = getCurrentCenterAccessToken();
  if (existingToken) {
    return existingToken;
  }

  const refreshedSession = await refreshCenterSession();
  return refreshedSession.accessToken;
}

function buildSessionsQueryString(query: CourseSessionListQuery) {
  const params = new URLSearchParams();

  if (typeof query.teacherId === "string" && query.teacherId.trim().length > 0) {
    params.set("teacherId", query.teacherId.trim());
  }

  if (
    typeof query.studentGroupId === "string" &&
    query.studentGroupId.trim().length > 0
  ) {
    params.set("studentGroupId", query.studentGroupId.trim());
  }

  if (typeof query.roomId === "string" && query.roomId.trim().length > 0) {
    params.set("roomId", query.roomId.trim());
  }

  if (typeof query.day === "string" && dayValues.has(query.day)) {
    params.set("day", query.day);
  }

  if (typeof query.status === "string" && statusValues.has(query.status)) {
    params.set("status", query.status);
  }

  if (
    typeof query.completedFrom === "string" &&
    query.completedFrom.trim().length > 0
  ) {
    params.set("completedFrom", query.completedFrom.trim());
  }

  if (typeof query.completedTo === "string" && query.completedTo.trim().length > 0) {
    params.set("completedTo", query.completedTo.trim());
  }

  if (typeof query.page === "number" && Number.isInteger(query.page) && query.page > 0) {
    params.set("page", String(query.page));
  }

  if (typeof query.limit === "number" && Number.isInteger(query.limit) && query.limit > 0) {
    params.set("limit", String(Math.min(query.limit, maxPageSize)));
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

export async function listCourseSessions(
  query: CourseSessionListQuery,
): Promise<CourseSession[]> {
  const queryKey = buildSessionsQueryString(query);
  const existingRequest = ongoingCourseSessionListRequests.get(queryKey);

  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const accessToken = await getRequiredCenterAccessToken();

    const response = await fetch(`${sessionsApiBasePath}${queryKey}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return parseSessionsApiResponse<CourseSession[]>(
      response,
      "Unable to load sessions",
    );
  })();

  ongoingCourseSessionListRequests.set(queryKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    ongoingCourseSessionListRequests.delete(queryKey);
  }
}

export async function createCourseSession(
  payload: CourseSessionCreatePayload,
): Promise<CourseSession> {
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(sessionsApiBasePath, {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseSessionsApiResponse<CourseSession>(
    response,
    "Unable to create session",
  );
}
