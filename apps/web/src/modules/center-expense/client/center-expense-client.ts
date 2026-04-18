"use client";

import {
  getCurrentCenterAccessToken,
  refreshCenterSession,
} from "@/modules/center/client/center-auth-client";
import type {
  CenterExpense,
  CenterExpenseCreatePayload,
  CenterExpenseListQuery,
  CenterExpenseUpdatePayload,
} from "../types/center-expense.types";

const centerExpensesApiBasePath = "/api/center-expenses";
const ongoingCenterExpenseRequests = new Map<string, Promise<CenterExpense[]>>();

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

async function parseCenterExpensesApiResponse<T>(
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

function buildCenterExpensesQueryString(query: CenterExpenseListQuery) {
  const params = new URLSearchParams();

  if (typeof query.user_id === "string" && query.user_id.trim().length > 0) {
    params.set("user_id", query.user_id.trim());
  }

  if (typeof query.month === "string" && query.month.trim().length > 0) {
    params.set("month", query.month.trim());
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

export async function listCenterExpenses(
  query: CenterExpenseListQuery,
): Promise<CenterExpense[]> {
  const queryKey = buildCenterExpensesQueryString(query);
  const existingRequest = ongoingCenterExpenseRequests.get(queryKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const accessToken = await getRequiredCenterAccessToken();

    const response = await fetch(`${centerExpensesApiBasePath}${queryKey}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return parseCenterExpensesApiResponse<CenterExpense[]>(
      response,
      "Unable to load center expenses",
    );
  })();

  ongoingCenterExpenseRequests.set(queryKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    ongoingCenterExpenseRequests.delete(queryKey);
  }
}

export async function createCenterExpense(
  payload: CenterExpenseCreatePayload,
): Promise<CenterExpense> {
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(centerExpensesApiBasePath, {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseCenterExpensesApiResponse<CenterExpense>(
    response,
    "Unable to create center expense",
  );
}

export async function updateCenterExpense(
  centerExpenseId: string,
  payload: CenterExpenseUpdatePayload,
): Promise<CenterExpense> {
  const accessToken = await getRequiredCenterAccessToken();
  const normalizedCenterExpenseId = centerExpenseId.trim();

  const response = await fetch(
    `${centerExpensesApiBasePath}/${normalizedCenterExpenseId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  return parseCenterExpensesApiResponse<CenterExpense>(
    response,
    "Unable to update center expense",
  );
}

export async function deleteCenterExpense(centerExpenseId: string): Promise<void> {
  const accessToken = await getRequiredCenterAccessToken();
  const normalizedCenterExpenseId = centerExpenseId.trim();

  const response = await fetch(
    `${centerExpensesApiBasePath}/${normalizedCenterExpenseId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  await parseCenterExpensesApiResponse<Record<string, unknown> | null>(
    response,
    "Unable to delete center expense",
  );
}
