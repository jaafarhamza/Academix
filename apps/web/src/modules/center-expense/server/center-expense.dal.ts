import "server-only";

import type {
  CenterExpense,
  CenterExpenseListQuery,
  CenterExpenseUserRole,
} from "../types/center-expense.types";

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

export class CenterExpenseBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "CenterExpenseBackendError";
    this.status = payload.status;
  }
}

function isCenterExpenseUserRole(value: unknown): value is CenterExpenseUserRole {
  return (
    value === "SUPER_ADMIN" ||
    value === "ADMIN" ||
    value === "TEACHER" ||
    value === "SECRETARY" ||
    value === "STUDENT"
  );
}

function assertIsCenterExpense(payload: unknown): asserts payload is CenterExpense {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid center expense payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.center_id !== "string" ||
    typeof value.user_id !== "string" ||
    typeof value.userName !== "string" ||
    !isCenterExpenseUserRole(value.userRole) ||
    typeof value.amount !== "number" ||
    typeof value.description !== "string" ||
    typeof value.date !== "string" ||
    typeof value.created_at !== "string"
  ) {
    throw new Error("Invalid center expense payload");
  }
}

function assertIsCenterExpenseList(
  payload: unknown,
): asserts payload is CenterExpense[] {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid center expenses payload");
  }

  for (const item of payload) {
    assertIsCenterExpense(item);
  }
}

function buildQueryString(query: CenterExpenseListQuery) {
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

async function parseBackendResponse<T>(
  response: Response,
  validator: (payload: unknown) => asserts payload is T,
) {
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new CenterExpenseBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

export async function getCenterExpensesWithBackend(
  accessToken: string,
  query: CenterExpenseListQuery,
): Promise<CenterExpense[]> {
  const queryString = buildQueryString(query);
  const response = await fetch(buildBackendUrl(`center-expenses${queryString}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsCenterExpenseList);
}
