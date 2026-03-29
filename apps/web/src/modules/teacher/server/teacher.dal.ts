import "server-only";

import type {
  Teacher,
  TeacherDetail,
  TeacherCreatePayload,
  TeacherListQuery,
  TeacherUpdatePayload,
} from "../types/teacher.types";

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

export class TeacherBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "TeacherBackendError";
    this.status = payload.status;
  }
}

function assertIsTeacherRecord(payload: unknown): asserts payload is Teacher {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid teacher payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.center_id !== "string" ||
    typeof value.firstName !== "string" ||
    typeof value.lastName !== "string" ||
    typeof value.email !== "string" ||
    typeof value.phone !== "string" ||
    value.role !== "TEACHER" ||
    (value.cin !== null && typeof value.cin !== "string") ||
    typeof value.isActive !== "boolean" ||
    typeof value.createdAt !== "string"
  ) {
    throw new Error("Invalid teacher payload");
  }
}

function assertIsTeacherList(payload: unknown): asserts payload is Teacher[] {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid teachers list payload");
  }

  for (const row of payload) {
    assertIsTeacherRecord(row);
  }
}

function assertIsTeacherDetail(payload: unknown): asserts payload is TeacherDetail {
  assertIsTeacherRecord(payload);

  const value = payload as Record<string, unknown>;
  if (
    typeof value.updatedAt !== "string" ||
    (value.hourlyRate !== null && typeof value.hourlyRate !== "number") ||
    (value.maxHoursPerWeek !== null && typeof value.maxHoursPerWeek !== "number") ||
    typeof value.hoursThisWeek !== "number" ||
    typeof value.hoursThisMonth !== "number" ||
    !Array.isArray(value.subjects)
  ) {
    throw new Error("Invalid teacher detail payload");
  }

  for (const subject of value.subjects) {
    if (!subject || typeof subject !== "object") {
      throw new Error("Invalid teacher detail payload");
    }

    const subjectRecord = subject as Record<string, unknown>;
    if (
      typeof subjectRecord.id !== "string" ||
      typeof subjectRecord.name !== "string"
    ) {
      throw new Error("Invalid teacher detail payload");
    }
  }
}

type TeacherDetailLike = {
  id: string;
};

function assertIsTeacherDetailLike(payload: unknown): asserts payload is TeacherDetailLike {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid teacher detail payload");
  }

  const value = payload as Record<string, unknown>;
  if (typeof value.id !== "string") {
    throw new Error("Invalid teacher detail payload");
  }
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

  const result = params.toString();
  return result.length > 0 ? `?${result}` : "";
}

async function parseBackendResponse<T>(
  response: Response,
  validator: (payload: unknown) => asserts payload is T,
) {
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new TeacherBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

export async function getTeachersWithBackend(
  accessToken: string,
  query: TeacherListQuery,
): Promise<Teacher[]> {
  const queryString = buildTeachersQueryString(query);

  const response = await fetch(buildBackendUrl(`teachers${queryString}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsTeacherList);
}

export async function getTeacherByIdWithBackend(
  accessToken: string,
  teacherId: string,
): Promise<TeacherDetail> {
  const normalizedTeacherId = teacherId.trim();

  const response = await fetch(buildBackendUrl(`teachers/${normalizedTeacherId}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsTeacherDetail);
}

export async function createTeacherWithBackend(
  accessToken: string,
  payload: TeacherCreatePayload,
): Promise<Teacher> {
  const response = await fetch(buildBackendUrl("teachers"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBackendResponse(response, assertIsTeacherRecord);
}

export async function updateTeacherWithBackend(
  accessToken: string,
  teacherId: string,
  payload: TeacherUpdatePayload,
): Promise<TeacherDetailLike> {
  const normalizedTeacherId = teacherId.trim();
  const response = await fetch(buildBackendUrl(`teachers/${normalizedTeacherId}`), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBackendResponse(response, assertIsTeacherDetailLike);
}
