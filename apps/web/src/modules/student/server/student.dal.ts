import "server-only";

import type {
  Student,
  StudentDetail,
  StudentPaymentHistory,
  StudentCreatePayload,
  StudentListQuery,
  StudentUpdatePayload,
} from "../types/student.types";

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

export class StudentBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "StudentBackendError";
    this.status = payload.status;
  }
}

function isSchoolCycle(value: unknown) {
  return value === "PRIMARY" || value === "COLLEGE" || value === "LYCEE";
}

function isSchoolYear(value: unknown) {
  return (
    value === "FIRST_YEAR" ||
    value === "SECOND_YEAR" ||
    value === "THIRD_YEAR" ||
    value === "FOURTH_YEAR" ||
    value === "FIFTH_YEAR" ||
    value === "SIXTH_YEAR"
  );
}

function assertIsStudentRecord(payload: unknown): asserts payload is Student {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid student payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.center_id !== "string" ||
    typeof value.firstName !== "string" ||
    typeof value.lastName !== "string" ||
    typeof value.email !== "string" ||
    typeof value.phone !== "string" ||
    value.role !== "STUDENT" ||
    (value.parentPhone !== null && typeof value.parentPhone !== "string") ||
    (value.schoolName !== null && typeof value.schoolName !== "string") ||
    (value.schoolCycle !== null && !isSchoolCycle(value.schoolCycle)) ||
    (value.schoolYear !== null && !isSchoolYear(value.schoolYear)) ||
    typeof value.isActive !== "boolean" ||
    typeof value.createdAt !== "string"
  ) {
    throw new Error("Invalid student payload");
  }
}

function assertIsStudentList(payload: unknown): asserts payload is Student[] {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid students list payload");
  }

  for (const row of payload) {
    assertIsStudentRecord(row);
  }
}

function assertIsStudentDetail(payload: unknown): asserts payload is StudentDetail {
  assertIsStudentRecord(payload);

  const value = payload as Record<string, unknown>;
  if (
    typeof value.updatedAt !== "string" ||
    !Array.isArray(value.enrollments) ||
    !Array.isArray(value.payments) ||
    !value.paymentSummary ||
    typeof value.paymentSummary !== "object"
  ) {
    throw new Error("Invalid student detail payload");
  }

  for (const enrollment of value.enrollments) {
    if (!enrollment || typeof enrollment !== "object") {
      throw new Error("Invalid student detail payload");
    }

    const enrollmentRecord = enrollment as Record<string, unknown>;
    if (
      typeof enrollmentRecord.id !== "string" ||
      typeof enrollmentRecord.enrollmentDate !== "string" ||
      typeof enrollmentRecord.isActive !== "boolean" ||
      typeof enrollmentRecord.groupId !== "string" ||
      typeof enrollmentRecord.groupName !== "string" ||
      !isSchoolCycle(enrollmentRecord.schoolCycle) ||
      !isSchoolYear(enrollmentRecord.schoolYear)
    ) {
      throw new Error("Invalid student detail payload");
    }
  }

  for (const payment of value.payments) {
    if (!payment || typeof payment !== "object") {
      throw new Error("Invalid student detail payload");
    }

    const paymentRecord = payment as Record<string, unknown>;
    if (
      typeof paymentRecord.id !== "string" ||
      typeof paymentRecord.amount !== "number" ||
      typeof paymentRecord.rest !== "number" ||
      typeof paymentRecord.paidAmount !== "number" ||
      (paymentRecord.status !== "PAID" &&
        paymentRecord.status !== "PARTIALLY_PAID" &&
        paymentRecord.status !== "UNPAID") ||
      paymentRecord.method !== "CASH" ||
      typeof paymentRecord.paymentDate !== "string" ||
      (paymentRecord.receiptUrl !== null &&
        typeof paymentRecord.receiptUrl !== "string") ||
      typeof paymentRecord.teacherId !== "string" ||
      typeof paymentRecord.teacherName !== "string" ||
      (paymentRecord.studentGroupId !== null &&
        typeof paymentRecord.studentGroupId !== "string") ||
      (paymentRecord.studentGroupName !== null &&
        typeof paymentRecord.studentGroupName !== "string")
    ) {
      throw new Error("Invalid student detail payload");
    }
  }

  const summary = value.paymentSummary as Record<string, unknown>;
  if (
    typeof summary.totalPayments !== "number" ||
    typeof summary.totalAmount !== "number" ||
    typeof summary.totalPaid !== "number" ||
    typeof summary.totalRest !== "number" ||
    typeof summary.outstandingBalance !== "number" ||
    (summary.lastPaymentDate !== null && typeof summary.lastPaymentDate !== "string")
  ) {
    throw new Error("Invalid student detail payload");
  }
}

type StudentDetailLike = {
  id: string;
};

function assertIsStudentDetailLike(payload: unknown): asserts payload is StudentDetailLike {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid student detail payload");
  }

  const value = payload as Record<string, unknown>;
  if (typeof value.id !== "string") {
    throw new Error("Invalid student detail payload");
  }
}

function assertIsStudentPaymentHistory(
  payload: unknown,
): asserts payload is StudentPaymentHistory {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid student payment history payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.center_id !== "string" ||
    typeof value.firstName !== "string" ||
    typeof value.lastName !== "string" ||
    typeof value.email !== "string" ||
    typeof value.phone !== "string" ||
    (value.schoolName !== null && typeof value.schoolName !== "string") ||
    typeof value.createdAt !== "string" ||
    !Array.isArray(value.payments) ||
    !value.paymentSummary ||
    typeof value.paymentSummary !== "object"
  ) {
    throw new Error("Invalid student payment history payload");
  }

  for (const payment of value.payments) {
    if (!payment || typeof payment !== "object") {
      throw new Error("Invalid student payment history payload");
    }

    const paymentRecord = payment as Record<string, unknown>;
    if (
      typeof paymentRecord.id !== "string" ||
      typeof paymentRecord.amount !== "number" ||
      typeof paymentRecord.rest !== "number" ||
      typeof paymentRecord.paidAmount !== "number" ||
      (paymentRecord.status !== "PAID" &&
        paymentRecord.status !== "PARTIALLY_PAID" &&
        paymentRecord.status !== "UNPAID") ||
      paymentRecord.method !== "CASH" ||
      typeof paymentRecord.paymentDate !== "string" ||
      (paymentRecord.receiptUrl !== null &&
        typeof paymentRecord.receiptUrl !== "string") ||
      typeof paymentRecord.teacherId !== "string" ||
      typeof paymentRecord.teacherName !== "string" ||
      (paymentRecord.studentGroupId !== null &&
        typeof paymentRecord.studentGroupId !== "string") ||
      (paymentRecord.studentGroupName !== null &&
        typeof paymentRecord.studentGroupName !== "string")
    ) {
      throw new Error("Invalid student payment history payload");
    }
  }

  const summary = value.paymentSummary as Record<string, unknown>;
  if (
    typeof summary.totalPayments !== "number" ||
    typeof summary.totalAmount !== "number" ||
    typeof summary.totalPaid !== "number" ||
    typeof summary.totalRest !== "number" ||
    typeof summary.outstandingBalance !== "number" ||
    (summary.lastPaymentDate !== null && typeof summary.lastPaymentDate !== "string")
  ) {
    throw new Error("Invalid student payment history payload");
  }
}

function buildStudentsQueryString(query: StudentListQuery) {
  const params = new URLSearchParams();

  if (typeof query.search === "string" && query.search.trim().length > 0) {
    params.set("search", query.search.trim());
  }

  if (typeof query.groupId === "string" && query.groupId.trim().length > 0) {
    params.set("groupId", query.groupId.trim());
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

  const result = params.toString();
  return result.length > 0 ? `?${result}` : "";
}

async function parseBackendResponse<T>(
  response: Response,
  validator: (payload: unknown) => asserts payload is T,
) {
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new StudentBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

export async function getStudentsWithBackend(
  accessToken: string,
  query: StudentListQuery,
): Promise<Student[]> {
  const queryString = buildStudentsQueryString(query);

  const response = await fetch(buildBackendUrl(`students${queryString}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsStudentList);
}

export async function getStudentByIdWithBackend(
  accessToken: string,
  studentId: string,
): Promise<StudentDetail> {
  const normalizedStudentId = studentId.trim();

  const response = await fetch(buildBackendUrl(`students/${normalizedStudentId}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsStudentDetail);
}

export async function getStudentPaymentHistoryWithBackend(
  accessToken: string,
  studentId: string,
): Promise<StudentPaymentHistory> {
  const normalizedStudentId = studentId.trim();

  const response = await fetch(
    buildBackendUrl(`students/${normalizedStudentId}/payments`),
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  return parseBackendResponse(response, assertIsStudentPaymentHistory);
}

export async function createStudentWithBackend(
  accessToken: string,
  payload: StudentCreatePayload,
): Promise<Student> {
  const response = await fetch(buildBackendUrl("students"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBackendResponse(response, assertIsStudentRecord);
}

export async function updateStudentWithBackend(
  accessToken: string,
  studentId: string,
  payload: StudentUpdatePayload,
): Promise<StudentDetailLike> {
  const normalizedStudentId = studentId.trim();
  const response = await fetch(buildBackendUrl(`students/${normalizedStudentId}`), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBackendResponse(response, assertIsStudentDetailLike);
}

export async function deactivateStudentWithBackend(
  accessToken: string,
  studentId: string,
): Promise<void> {
  const normalizedStudentId = studentId.trim();
  const response = await fetch(buildBackendUrl(`students/${normalizedStudentId}`), {
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
  throw new StudentBackendError({
    status: response.status,
    message: parseApiErrorMessage(payload),
  });
}

export async function activateStudentWithBackend(
  accessToken: string,
  studentId: string,
): Promise<void> {
  const normalizedStudentId = studentId.trim();
  const response = await fetch(
    buildBackendUrl(`students/${normalizedStudentId}/activate`),
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
  throw new StudentBackendError({
    status: response.status,
    message: parseApiErrorMessage(payload),
  });
}
