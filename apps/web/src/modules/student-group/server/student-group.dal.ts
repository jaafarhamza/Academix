import "server-only";

import type {
  StudentGroup,
  StudentGroupListQuery,
  StudentGroupStatus,
} from "../types/student-group.types";

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

export class StudentGroupBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "StudentGroupBackendError";
    this.status = payload.status;
  }
}

function assertIsStudentGroup(payload: unknown): asserts payload is StudentGroup {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid student group payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.center_id !== "string" ||
    typeof value.teacher_subject_id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.schoolCycle !== "string" ||
    typeof value.schoolYear !== "string"
  ) {
    throw new Error("Invalid student group payload");
  }
}

function assertIsStudentGroupList(
  payload: unknown,
): asserts payload is StudentGroup[] {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid student groups payload");
  }

  for (const row of payload) {
    assertIsStudentGroup(row);
  }
}

function assertIsStatus(payload: unknown): asserts payload is StudentGroupStatus {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid student-group status payload");
  }

  const value = payload as Record<string, unknown>;
  if (typeof value.module !== "string" || typeof value.status !== "string") {
    throw new Error("Invalid student-group status payload");
  }
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

async function parseBackendResponse<T>(
  response: Response,
  validator: (payload: unknown) => asserts payload is T,
) {
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new StudentGroupBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

export async function getStudentGroupsWithBackend(
  accessToken: string,
  query: StudentGroupListQuery,
): Promise<StudentGroup[]> {
  const queryString = buildQueryString(query);
  const response = await fetch(buildBackendUrl(`student-groups${queryString}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsStudentGroupList);
}

export async function getStudentGroupStatusWithBackend(
  accessToken: string,
): Promise<StudentGroupStatus> {
  const response = await fetch(buildBackendUrl("student-groups/status"), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsStatus);
}
