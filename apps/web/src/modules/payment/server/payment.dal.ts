import "server-only";

import type {
  Payment,
  PaymentCreatePayload,
  PaymentListQuery,
  PaymentMethod,
  PaymentStatus,
} from "../types/payment.types";

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

  if (Array.isArray(message)) {
    const firstMessage = message.find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

    if (firstMessage) {
      return firstMessage;
    }
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

export type PaymentReceiptBackendResponse = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentDisposition: string | null;
};

export class PaymentBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "PaymentBackendError";
    this.status = payload.status;
  }
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "CASH";
}

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    value === "PAID" ||
    value === "PARTIALLY_PAID" ||
    value === "UNPAID"
  );
}

function assertIsPayment(payload: unknown): asserts payload is Payment {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payment payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.center_id !== "string" ||
    typeof value.student_id !== "string" ||
    typeof value.studentName !== "string" ||
    typeof value.teacher_id !== "string" ||
    typeof value.teacherName !== "string" ||
    (value.student_group_id !== null &&
      typeof value.student_group_id !== "string") ||
    (value.studentGroupName !== null &&
      typeof value.studentGroupName !== "string") ||
    (value.course_session_id !== null &&
      typeof value.course_session_id !== "string") ||
    typeof value.amount !== "number" ||
    typeof value.rest !== "number" ||
    typeof value.paidAmount !== "number" ||
    typeof value.paymentDate !== "string" ||
    !isPaymentMethod(value.method) ||
    !isPaymentStatus(value.status) ||
    (value.receiptUrl !== null && typeof value.receiptUrl !== "string") ||
    (value.notes !== null && typeof value.notes !== "string") ||
    typeof value.createdAt !== "string"
  ) {
    throw new Error("Invalid payment payload");
  }
}

function assertIsPaymentList(payload: unknown): asserts payload is Payment[] {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid payments payload");
  }

  for (const row of payload) {
    assertIsPayment(row);
  }
}

function buildQueryString(query: PaymentListQuery) {
  const params = new URLSearchParams();

  if (typeof query.student_id === "string" && query.student_id.trim().length > 0) {
    params.set("student_id", query.student_id.trim());
  }

  if (typeof query.teacher_id === "string" && query.teacher_id.trim().length > 0) {
    params.set("teacher_id", query.teacher_id.trim());
  }

  if (
    typeof query.student_group_id === "string" &&
    query.student_group_id.trim().length > 0
  ) {
    params.set("student_group_id", query.student_group_id.trim());
  }

  if (typeof query.status === "string" && isPaymentStatus(query.status)) {
    params.set("status", query.status);
  }

  if (
    typeof query.payment_from === "string" &&
    query.payment_from.trim().length > 0
  ) {
    params.set("payment_from", query.payment_from.trim());
  }

  if (typeof query.payment_to === "string" && query.payment_to.trim().length > 0) {
    params.set("payment_to", query.payment_to.trim());
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
    throw new PaymentBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

export async function getPaymentsWithBackend(
  accessToken: string,
  query: PaymentListQuery,
): Promise<Payment[]> {
  const queryString = buildQueryString(query);
  const response = await fetch(buildBackendUrl(`payments${queryString}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsPaymentList);
}

export async function createPaymentWithBackend(
  accessToken: string,
  payload: PaymentCreatePayload,
): Promise<Payment> {
  const response = await fetch(buildBackendUrl("payments"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBackendResponse(response, assertIsPayment);
}

export async function getPaymentReceiptWithBackend(
  accessToken: string,
  paymentId: string,
): Promise<PaymentReceiptBackendResponse> {
  const normalizedPaymentId = paymentId.trim();
  const response = await fetch(
    buildBackendUrl(`payments/${normalizedPaymentId}/receipt`),
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/pdf, application/json",
      },
    },
  );

  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new PaymentBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  if (!response.body) {
    throw new PaymentBackendError({
      status: 502,
      message: "Receipt stream is unavailable",
    });
  }

  return {
    body: response.body,
    contentType: response.headers.get("content-type") ?? "application/pdf",
    contentDisposition: response.headers.get("content-disposition"),
  };
}
