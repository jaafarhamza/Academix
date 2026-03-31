import "server-only";

import type {
  Enrollment,
  EnrollmentCreatePayload,
  EnrollmentListQuery,
} from "../types/enrollment.types";

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

export class EnrollmentBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "EnrollmentBackendError";
    this.status = payload.status;
  }
}

function assertIsEnrollment(payload: unknown): asserts payload is Enrollment {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid enrollment payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.student_id !== "string" ||
    typeof value.student_group_id !== "string" ||
    typeof value.enrollmentDate !== "string" ||
    typeof value.isActive !== "boolean"
  ) {
    throw new Error("Invalid enrollment payload");
  }
}

function assertIsEnrollmentList(payload: unknown): asserts payload is Enrollment[] {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid enrollments payload");
  }

  for (const row of payload) {
    assertIsEnrollment(row);
  }
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

async function parseBackendResponse<T>(
  response: Response,
  validator: (payload: unknown) => asserts payload is T,
) {
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new EnrollmentBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

export async function getEnrollmentsWithBackend(
  accessToken: string,
  query: EnrollmentListQuery,
): Promise<Enrollment[]> {
  const queryString = buildQueryString(query);
  const response = await fetch(buildBackendUrl(`enrollments${queryString}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsEnrollmentList);
}

export async function createEnrollmentWithBackend(
  accessToken: string,
  payload: EnrollmentCreatePayload,
): Promise<Enrollment> {
  const response = await fetch(buildBackendUrl("enrollments"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBackendResponse(response, assertIsEnrollment);
}

export async function deactivateEnrollmentWithBackend(
  accessToken: string,
  enrollmentId: string,
): Promise<void> {
  const normalizedEnrollmentId = enrollmentId.trim();
  const response = await fetch(
    buildBackendUrl(`enrollments/${normalizedEnrollmentId}/deactivate`),
    {
      method: "PATCH",
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
  throw new EnrollmentBackendError({
    status: response.status,
    message: parseApiErrorMessage(payload),
  });
}
