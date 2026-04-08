"use client";

import {
  getCurrentCenterAccessToken,
  refreshCenterSession,
} from "@/modules/center/client/center-auth-client";
import type {
  Payment,
  PaymentCreatePayload,
  PaymentListQuery,
} from "../types/payment.types";

const paymentsApiBasePath = "/api/payments";
const ongoingPaymentListRequests = new Map<string, Promise<Payment[]>>();

function extractMessageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeMessage = (payload as Record<string, unknown>).message;
  if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
    return maybeMessage;
  }

  if (Array.isArray(maybeMessage)) {
    const firstMessage = maybeMessage.find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

    if (firstMessage) {
      return firstMessage;
    }
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

async function parsePaymentsApiResponse<T>(
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

  if (typeof query.status === "string") {
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

export async function listPayments(query: PaymentListQuery): Promise<Payment[]> {
  const queryKey = buildQueryString(query);
  const existingRequest = ongoingPaymentListRequests.get(queryKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const accessToken = await getRequiredCenterAccessToken();
    const response = await fetch(`${paymentsApiBasePath}${queryKey}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return parsePaymentsApiResponse<Payment[]>(
      response,
      "Unable to load payments",
    );
  })();

  ongoingPaymentListRequests.set(queryKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    ongoingPaymentListRequests.delete(queryKey);
  }
}

export async function createPayment(
  payload: PaymentCreatePayload,
): Promise<Payment> {
  const accessToken = await getRequiredCenterAccessToken();
  const response = await fetch(paymentsApiBasePath, {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parsePaymentsApiResponse<Payment>(
    response,
    "Unable to record payment",
  );
}
