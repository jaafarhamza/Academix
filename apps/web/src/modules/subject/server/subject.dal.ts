import "server-only";

import type {
  Subject,
  SubjectCreatePayload,
  SubjectDetail,
  SubjectListQuery,
  SubjectStatus,
  SubjectUpdatePayload,
} from "../types/subject.types";

const defaultBackendBaseUrl = "http://localhost:3001";

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
  status: number;
  message: string;
};

export class SubjectBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "SubjectBackendError";
    this.status = payload.status;
  }
}

function assertIsSubjectStatus(payload: unknown): asserts payload is SubjectStatus {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid subject status payload");
  }

  const value = payload as Record<string, unknown>;
  if (typeof value.module !== "string" || typeof value.status !== "string") {
    throw new Error("Invalid subject status payload");
  }
}

function assertIsSubjectRecord(payload: unknown): asserts payload is Subject {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid subject payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.center_id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.description !== "string"
  ) {
    throw new Error("Invalid subject payload");
  }
}

function assertIsSubjectList(payload: unknown): asserts payload is Subject[] {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid subjects list payload");
  }

  for (const row of payload) {
    assertIsSubjectRecord(row);
  }
}

function assertIsSubjectDetail(payload: unknown): asserts payload is SubjectDetail {
  assertIsSubjectRecord(payload);

  const value = payload as Record<string, unknown>;
  if (
    typeof value.teacherAssignmentsCount !== "number" ||
    typeof value.sessionsCount !== "number"
  ) {
    throw new Error("Invalid subject detail payload");
  }
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

  const result = params.toString();
  return result.length > 0 ? `?${result}` : "";
}

async function parseBackendResponse<T>(
  response: Response,
  validator: (payload: unknown) => asserts payload is T,
) {
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new SubjectBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

export async function getSubjectsWithBackend(
  accessToken: string,
  query: SubjectListQuery,
): Promise<Subject[]> {
  const queryString = buildSubjectsQueryString(query);

  const response = await fetch(buildBackendUrl(`subjects${queryString}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsSubjectList);
}

export async function getSubjectByIdWithBackend(
  accessToken: string,
  subjectId: string,
): Promise<SubjectDetail> {
  const normalizedSubjectId = subjectId.trim();

  const response = await fetch(buildBackendUrl(`subjects/${normalizedSubjectId}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsSubjectDetail);
}

export async function createSubjectWithBackend(
  accessToken: string,
  payload: SubjectCreatePayload,
): Promise<Subject> {
  const response = await fetch(buildBackendUrl("subjects"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBackendResponse(response, assertIsSubjectRecord);
}

export async function updateSubjectWithBackend(
  accessToken: string,
  subjectId: string,
  payload: SubjectUpdatePayload,
): Promise<SubjectDetail> {
  const normalizedSubjectId = subjectId.trim();

  const response = await fetch(buildBackendUrl(`subjects/${normalizedSubjectId}`), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBackendResponse(response, assertIsSubjectDetail);
}

export async function deleteSubjectWithBackend(
  accessToken: string,
  subjectId: string,
): Promise<void> {
  const normalizedSubjectId = subjectId.trim();

  const response = await fetch(buildBackendUrl(`subjects/${normalizedSubjectId}`), {
    method: "DELETE",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (response.ok) {
    return;
  }

  const payload = await parseResponsePayload(response);
  throw new SubjectBackendError({
    status: response.status,
    message: parseApiErrorMessage(payload),
  });
}

export async function getSubjectStatusWithBackend(
  accessToken: string,
): Promise<SubjectStatus> {
  const response = await fetch(buildBackendUrl("subjects/status"), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsSubjectStatus);
}
