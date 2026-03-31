import "server-only";

import type {
  TeacherSubjectAssignment,
  TeacherSubjectCreatePayload,
  TeacherSubjectListQuery,
  TeacherSubjectStatus,
} from "../types/teacher-subject.types";

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
    const nestedMessage = (message as Record<string, unknown>).message;
    if (
      typeof nestedMessage === "string" &&
      nestedMessage.trim().length > 0
    ) {
      return nestedMessage;
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

export class TeacherSubjectBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "TeacherSubjectBackendError";
    this.status = payload.status;
  }
}

function assertIsTeacher(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid assignment payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.firstName !== "string" ||
    typeof value.lastName !== "string" ||
    typeof value.email !== "string"
  ) {
    throw new Error("Invalid assignment payload");
  }
}

function assertIsSubject(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid assignment payload");
  }

  const value = payload as Record<string, unknown>;
  if (typeof value.id !== "string" || typeof value.name !== "string") {
    throw new Error("Invalid assignment payload");
  }
}

function assertIsAssignment(
  payload: unknown,
): asserts payload is TeacherSubjectAssignment {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid assignment payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.teacher_id !== "string" ||
    typeof value.subject_id !== "string"
  ) {
    throw new Error("Invalid assignment payload");
  }

  assertIsTeacher(value.teacher);
  assertIsSubject(value.subject);
}

function assertIsAssignmentList(
  payload: unknown,
): asserts payload is TeacherSubjectAssignment[] {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid assignments list payload");
  }

  for (const row of payload) {
    assertIsAssignment(row);
  }
}

function assertIsStatus(payload: unknown): asserts payload is TeacherSubjectStatus {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid teacher-subject status payload");
  }

  const value = payload as Record<string, unknown>;
  if (typeof value.module !== "string" || typeof value.status !== "string") {
    throw new Error("Invalid teacher-subject status payload");
  }
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
    throw new TeacherSubjectBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

export async function getTeacherSubjectsWithBackend(
  accessToken: string,
  query: TeacherSubjectListQuery,
): Promise<TeacherSubjectAssignment[]> {
  const queryString = buildQueryString(query);
  const response = await fetch(
    buildBackendUrl(`teacher-subjects${queryString}`),
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  return parseBackendResponse(response, assertIsAssignmentList);
}

export async function createTeacherSubjectWithBackend(
  accessToken: string,
  payload: TeacherSubjectCreatePayload,
): Promise<TeacherSubjectAssignment> {
  const response = await fetch(buildBackendUrl("teacher-subjects"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBackendResponse(response, assertIsAssignment);
}

export async function deleteTeacherSubjectWithBackend(
  accessToken: string,
  assignmentId: string,
): Promise<void> {
  const normalizedId = assignmentId.trim();
  const response = await fetch(
    buildBackendUrl(`teacher-subjects/${normalizedId}`),
    {
      method: "DELETE",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (response.ok) {
    return;
  }

  const payload = await parseResponsePayload(response);
  throw new TeacherSubjectBackendError({
    status: response.status,
    message: parseApiErrorMessage(payload),
  });
}

export async function getTeacherSubjectStatusWithBackend(
  accessToken: string,
): Promise<TeacherSubjectStatus> {
  const response = await fetch(buildBackendUrl("teacher-subjects/status"), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsStatus);
}
