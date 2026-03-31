"use client";

import {
  getCurrentCenterAccessToken,
  refreshCenterSession,
} from "@/modules/center/client/center-auth-client";
import type {
  TeacherSubjectAssignment,
  TeacherSubjectCreatePayload,
  TeacherSubjectListQuery,
  TeacherSubjectStatus,
} from "../types/teacher-subject.types";

const teacherSubjectsApiBasePath = "/api/teacher-subjects";
const teacherSubjectMaxLimit = 100;
const ongoingTeacherSubjectListRequests = new Map<
  string,
  Promise<TeacherSubjectAssignment[]>
>();

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

function buildQueryString(query: TeacherSubjectListQuery) {
  const params = new URLSearchParams();

  if (typeof query.teacherId === "string" && query.teacherId.trim().length > 0) {
    params.set("teacherId", query.teacherId.trim());
  }

  if (typeof query.subjectId === "string" && query.subjectId.trim().length > 0) {
    params.set("subjectId", query.subjectId.trim());
  }

  if (typeof query.page === "number" && Number.isInteger(query.page) && query.page > 0) {
    params.set("page", String(query.page));
  }

  if (typeof query.limit === "number" && Number.isInteger(query.limit) && query.limit > 0) {
    params.set("limit", String(Math.min(query.limit, teacherSubjectMaxLimit)));
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

export async function listTeacherSubjects(
  query: TeacherSubjectListQuery,
): Promise<TeacherSubjectAssignment[]> {
  const queryKey = buildQueryString(query);
  const existingRequest = ongoingTeacherSubjectListRequests.get(queryKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const accessToken = await getRequiredCenterAccessToken();
    const response = await fetch(`${teacherSubjectsApiBasePath}${queryKey}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return parseApiResponse<TeacherSubjectAssignment[]>(
      response,
      "Unable to load teacher-subject assignments",
    );
  })();

  ongoingTeacherSubjectListRequests.set(queryKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    ongoingTeacherSubjectListRequests.delete(queryKey);
  }
}

export async function createTeacherSubject(
  payload: TeacherSubjectCreatePayload,
): Promise<TeacherSubjectAssignment> {
  const accessToken = await getRequiredCenterAccessToken();
  const response = await fetch(teacherSubjectsApiBasePath, {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse<TeacherSubjectAssignment>(
    response,
    "Unable to create teacher-subject assignment",
  );
}

export async function deleteTeacherSubject(assignmentId: string): Promise<void> {
  const normalizedId = assignmentId.trim();
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(`${teacherSubjectsApiBasePath}/${normalizedId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  await parseApiResponse<Record<string, unknown> | null>(
    response,
    "Unable to remove teacher-subject assignment",
  );
}

export async function getTeacherSubjectStatus(): Promise<TeacherSubjectStatus> {
  const accessToken = await getRequiredCenterAccessToken();
  const response = await fetch(`${teacherSubjectsApiBasePath}/status`, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseApiResponse<TeacherSubjectStatus>(
    response,
    "Unable to load teacher-subject status",
  );
}
