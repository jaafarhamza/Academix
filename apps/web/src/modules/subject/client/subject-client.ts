"use client";

import {
  getCurrentCenterAccessToken,
  refreshCenterSession,
} from "@/modules/center/client/center-auth-client";
import type {
  Subject,
  SubjectCreatePayload,
  SubjectDetail,
  SubjectListQuery,
  SubjectStatus,
  SubjectUpdatePayload,
} from "../types/subject.types";

const subjectsApiBasePath = "/api/subjects";
const ongoingSubjectListRequests = new Map<string, Promise<Subject[]>>();

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

async function parseSubjectsApiResponse<T>(response: Response, fallbackMessage: string) {
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

function buildSubjectsQueryString(query: SubjectListQuery) {
  const params = new URLSearchParams();

  if (typeof query.search === "string" && query.search.trim().length > 0) {
    params.set("search", query.search.trim());
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

export async function listSubjects(query: SubjectListQuery): Promise<Subject[]> {
  const queryKey = buildSubjectsQueryString(query);
  const existingRequest = ongoingSubjectListRequests.get(queryKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const accessToken = await getRequiredCenterAccessToken();

    const response = await fetch(`${subjectsApiBasePath}${queryKey}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return parseSubjectsApiResponse<Subject[]>(response, "Unable to load subjects");
  })();

  ongoingSubjectListRequests.set(queryKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    ongoingSubjectListRequests.delete(queryKey);
  }
}

export async function createSubject(payload: SubjectCreatePayload): Promise<Subject> {
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(subjectsApiBasePath, {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseSubjectsApiResponse<Subject>(response, "Unable to create subject");
}

export async function getSubjectDetail(subjectId: string): Promise<SubjectDetail> {
  const normalizedSubjectId = subjectId.trim();
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(`${subjectsApiBasePath}/${normalizedSubjectId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseSubjectsApiResponse<SubjectDetail>(
    response,
    "Unable to load subject details",
  );
}

export async function updateSubject(
  subjectId: string,
  payload: SubjectUpdatePayload,
): Promise<void> {
  const normalizedSubjectId = subjectId.trim();
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(`${subjectsApiBasePath}/${normalizedSubjectId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  await parseSubjectsApiResponse<Record<string, unknown>>(
    response,
    "Unable to update subject",
  );
}

export async function deleteSubject(subjectId: string): Promise<void> {
  const normalizedSubjectId = subjectId.trim();
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(`${subjectsApiBasePath}/${normalizedSubjectId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  await parseSubjectsApiResponse<Record<string, unknown> | null>(
    response,
    "Unable to delete subject",
  );
}

export async function getSubjectStatus(): Promise<SubjectStatus> {
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(`${subjectsApiBasePath}/status`, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseSubjectsApiResponse<SubjectStatus>(
    response,
    "Unable to load subject status",
  );
}
