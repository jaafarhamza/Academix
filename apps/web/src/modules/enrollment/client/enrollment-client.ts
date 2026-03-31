"use client";

import {
  getCurrentCenterAccessToken,
  refreshCenterSession,
} from "@/modules/center/client/center-auth-client";
import type {
  Enrollment,
  EnrollmentCreatePayload,
  EnrollmentListQuery,
} from "../types/enrollment.types";

const enrollmentsApiBasePath = "/api/enrollments";
const ongoingEnrollmentListRequests = new Map<string, Promise<Enrollment[]>>();

function extractMessageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeMessage = (payload as Record<string, unknown>).message;
  if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
    return maybeMessage;
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

async function parseApiResponse<T>(response: Response, fallbackMessage: string) {
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

function buildQueryString(query: EnrollmentListQuery) {
  const params = new URLSearchParams();

  if (typeof query.studentId === "string" && query.studentId.trim().length > 0) {
    params.set("studentId", query.studentId.trim());
  }

  if (
    typeof query.studentGroupId === "string" &&
    query.studentGroupId.trim().length > 0
  ) {
    params.set("studentGroupId", query.studentGroupId.trim());
  }

  if (typeof query.isActive === "boolean") {
    params.set("isActive", query.isActive ? "true" : "false");
  }

  if (typeof query.page === "number" && Number.isInteger(query.page) && query.page > 0) {
    params.set("page", String(query.page));
  }

  if (typeof query.limit === "number" && Number.isInteger(query.limit) && query.limit > 0) {
    params.set("limit", String(query.limit));
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

export async function listEnrollments(
  query: EnrollmentListQuery,
): Promise<Enrollment[]> {
  const queryKey = buildQueryString(query);
  const existingRequest = ongoingEnrollmentListRequests.get(queryKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const accessToken = await getRequiredCenterAccessToken();
    const response = await fetch(`${enrollmentsApiBasePath}${queryKey}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return parseApiResponse<Enrollment[]>(response, "Unable to load enrollments");
  })();

  ongoingEnrollmentListRequests.set(queryKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    ongoingEnrollmentListRequests.delete(queryKey);
  }
}

export async function createEnrollment(
  payload: EnrollmentCreatePayload,
): Promise<Enrollment> {
  const accessToken = await getRequiredCenterAccessToken();
  const response = await fetch(enrollmentsApiBasePath, {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse<Enrollment>(response, "Unable to create enrollment");
}

export async function deactivateEnrollment(enrollmentId: string): Promise<void> {
  const normalizedEnrollmentId = enrollmentId.trim();
  const accessToken = await getRequiredCenterAccessToken();
  const response = await fetch(
    `${enrollmentsApiBasePath}/${normalizedEnrollmentId}/deactivate`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  await parseApiResponse<Record<string, unknown> | null>(
    response,
    "Unable to deactivate enrollment",
  );
}
