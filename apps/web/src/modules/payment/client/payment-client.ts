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

export type PaymentExpectedAmountResolution = {
  amount: number | null;
  source: "student_history" | "group_history" | "none";
};

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

export async function openPaymentReceipt(paymentId: string): Promise<void> {
  const normalizedPaymentId = paymentId.trim();
  if (!normalizedPaymentId) {
    throw new Error("Payment id is required to open a receipt.");
  }

  const receiptWindow = window.open("about:blank", "_blank");
  if (!receiptWindow) {
    throw new Error("Please allow pop-ups to open the payment receipt.");
  }

  try {
    receiptWindow.opener = null;
  } catch {
    // Some browsers restrict writing opener; opening the receipt still works.
  }

  receiptWindow.document.title = "Payment receipt";
  receiptWindow.document.body.innerHTML =
    "<p style=\"font-family: sans-serif; padding: 16px;\">Loading receipt...</p>";

  try {
    const accessToken = await getRequiredCenterAccessToken();
    const response = await fetch(
      `${paymentsApiBasePath}/${encodeURIComponent(normalizedPaymentId)}/receipt`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/pdf",
        },
      },
    );

    if (!response.ok) {
      const payload = await parseJsonResponse(response);
      throw new Error(
        extractMessageFromPayload(payload) ?? "Unable to open payment receipt",
      );
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    receiptWindow.location.href = objectUrl;
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 60_000);
  } catch (error) {
    receiptWindow.close();
    throw error;
  }
}

export async function resolveExpectedPaymentAmount(input: {
  student_id: string;
  teacher_id: string;
  student_group_id?: string;
}): Promise<PaymentExpectedAmountResolution> {
  const exactMatchPayments = await listPayments({
    student_id: input.student_id,
    teacher_id: input.teacher_id,
    student_group_id: input.student_group_id,
    page: 1,
    limit: 1,
  });

  const exactAmount = exactMatchPayments[0]?.amount;
  if (typeof exactAmount === "number") {
    return {
      amount: exactAmount,
      source: "student_history",
    };
  }

  if (typeof input.student_group_id === "string" && input.student_group_id.trim().length > 0) {
    const groupMatchPayments = await listPayments({
      teacher_id: input.teacher_id,
      student_group_id: input.student_group_id,
      page: 1,
      limit: 1,
    });

    const groupAmount = groupMatchPayments[0]?.amount;
    if (typeof groupAmount === "number") {
      return {
        amount: groupAmount,
        source: "group_history",
      };
    }
  }

  return {
    amount: null,
    source: "none",
  };
}
