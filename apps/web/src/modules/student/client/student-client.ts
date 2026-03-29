"use client";

import {
  getCurrentCenterAccessToken,
  refreshCenterSession,
} from "@/modules/center/client/center-auth-client";
import type { Student, StudentListQuery } from "../types/student.types";

const studentsApiBasePath = "/api/students";
const ongoingStudentListRequests = new Map<string, Promise<Student[]>>();

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

async function parseStudentsApiResponse<T>(
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

function buildStudentsQueryString(query: StudentListQuery) {
  const params = new URLSearchParams();

  if (typeof query.search === "string" && query.search.trim().length > 0) {
    params.set("search", query.search.trim());
  }

  if (typeof query.schoolCycle === "string") {
    params.set("schoolCycle", query.schoolCycle);
  }

  if (typeof query.schoolYear === "string") {
    params.set("schoolYear", query.schoolYear);
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

export async function listStudents(query: StudentListQuery): Promise<Student[]> {
  const queryKey = buildStudentsQueryString(query);
  const existingRequest = ongoingStudentListRequests.get(queryKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const accessToken = await getRequiredCenterAccessToken();

    const response = await fetch(`${studentsApiBasePath}${queryKey}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return parseStudentsApiResponse<Student[]>(
      response,
      "Unable to load students",
    );
  })();

  ongoingStudentListRequests.set(queryKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    ongoingStudentListRequests.delete(queryKey);
  }
}
