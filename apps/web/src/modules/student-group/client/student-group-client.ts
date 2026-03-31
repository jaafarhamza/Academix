"use client";

import {
  getCurrentCenterAccessToken,
  refreshCenterSession,
} from "@/modules/center/client/center-auth-client";
import type {
  StudentGroupCreatePayload,
  StudentGroup,
  StudentGroupListQuery,
  StudentGroupStatus,
} from "../types/student-group.types";

const studentGroupsApiBasePath = "/api/student-groups";
const ongoingStudentGroupListRequests = new Map<string, Promise<StudentGroup[]>>();

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

function buildQueryString(query: StudentGroupListQuery) {
  const params = new URLSearchParams();

  if (typeof query.schoolCycle === "string" && query.schoolCycle.trim().length > 0) {
    params.set("schoolCycle", query.schoolCycle.trim());
  }

  if (typeof query.schoolYear === "string" && query.schoolYear.trim().length > 0) {
    params.set("schoolYear", query.schoolYear.trim());
  }

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
    params.set("limit", String(query.limit));
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

export async function listStudentGroups(
  query: StudentGroupListQuery,
): Promise<StudentGroup[]> {
  const queryKey = buildQueryString(query);
  const existingRequest = ongoingStudentGroupListRequests.get(queryKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const accessToken = await getRequiredCenterAccessToken();
    const response = await fetch(`${studentGroupsApiBasePath}${queryKey}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return parseApiResponse<StudentGroup[]>(
      response,
      "Unable to load student groups",
    );
  })();

  ongoingStudentGroupListRequests.set(queryKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    ongoingStudentGroupListRequests.delete(queryKey);
  }
}

export async function getStudentGroupStatus(): Promise<StudentGroupStatus> {
  const accessToken = await getRequiredCenterAccessToken();
  const response = await fetch(`${studentGroupsApiBasePath}/status`, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseApiResponse<StudentGroupStatus>(
    response,
    "Unable to load student-group status",
  );
}

export async function createStudentGroup(
  payload: StudentGroupCreatePayload,
): Promise<StudentGroup> {
  const accessToken = await getRequiredCenterAccessToken();
  const response = await fetch(studentGroupsApiBasePath, {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse<StudentGroup>(response, "Unable to create student group");
}
