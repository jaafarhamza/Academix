"use client";

import { getCurrentCenterAccessToken, refreshCenterSession } from "@/modules/center/client/center-auth-client";
import type {
  Teacher,
  TeacherDetail,
  TeacherCreatePayload,
  TeacherListQuery,
  TeacherUpdatePayload,
} from "../types/teacher.types";

const teachersApiBasePath = "/api/teachers";
const ongoingTeacherListRequests = new Map<string, Promise<Teacher[]>>();

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

async function parseTeachersApiResponse<T>(
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

function buildTeachersQueryString(query: TeacherListQuery) {
  const params = new URLSearchParams();

  if (typeof query.search === "string" && query.search.trim().length > 0) {
    params.set("search", query.search.trim());
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

export async function listTeachers(query: TeacherListQuery): Promise<Teacher[]> {
  const queryKey = buildTeachersQueryString(query);
  const existingRequest = ongoingTeacherListRequests.get(queryKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const accessToken = await getRequiredCenterAccessToken();

    const response = await fetch(`${teachersApiBasePath}${queryKey}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return parseTeachersApiResponse<Teacher[]>(
      response,
      "Unable to load teachers",
    );
  })();

  ongoingTeacherListRequests.set(queryKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    ongoingTeacherListRequests.delete(queryKey);
  }
}

export async function createTeacher(payload: TeacherCreatePayload): Promise<Teacher> {
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(teachersApiBasePath, {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseTeachersApiResponse<Teacher>(
    response,
    "Unable to create teacher",
  );
}

export async function getTeacherDetail(teacherId: string): Promise<TeacherDetail> {
  const normalizedTeacherId = teacherId.trim();
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(`${teachersApiBasePath}/${normalizedTeacherId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseTeachersApiResponse<TeacherDetail>(
    response,
    "Unable to load teacher details",
  );
}

export async function updateTeacher(
  teacherId: string,
  payload: TeacherUpdatePayload,
): Promise<void> {
  const normalizedTeacherId = teacherId.trim();
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(`${teachersApiBasePath}/${normalizedTeacherId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  await parseTeachersApiResponse<Record<string, unknown>>(
    response,
    "Unable to update teacher",
  );
}
