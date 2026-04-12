import "server-only";

import type {
  FinancialDashboard,
  FinancialDashboardQuery,
} from "../types/dashboard.types";

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

export class DashboardBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "DashboardBackendError";
    this.status = payload.status;
  }
}

function assertIsFinancialDashboard(
  payload: unknown,
): asserts payload is FinancialDashboard {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid financial dashboard payload");
  }

  const value = payload as Record<string, unknown>;
  const range = value.range as Record<string, unknown> | null;
  const totals = value.totals as Record<string, unknown> | null;
  const series = value.series;

  if (
    (value.period !== "THIS_MONTH" &&
      value.period !== "LAST_MONTH" &&
      value.period !== "CUSTOM") ||
    !range ||
    typeof range.from !== "string" ||
    typeof range.to !== "string" ||
    !totals ||
    typeof totals.collected !== "number" ||
    typeof totals.expected !== "number" ||
    typeof totals.outstanding !== "number" ||
    typeof totals.paymentsCount !== "number" ||
    typeof totals.collectionRate !== "number" ||
    !Array.isArray(series)
  ) {
    throw new Error("Invalid financial dashboard payload");
  }

  for (const point of series) {
    if (!point || typeof point !== "object") {
      throw new Error("Invalid financial dashboard payload");
    }

    const item = point as Record<string, unknown>;
    if (
      typeof item.date !== "string" ||
      typeof item.collected !== "number" ||
      typeof item.expected !== "number" ||
      typeof item.outstanding !== "number" ||
      typeof item.paymentsCount !== "number"
    ) {
      throw new Error("Invalid financial dashboard payload");
    }
  }
}

function buildQueryString(query: FinancialDashboardQuery) {
  const params = new URLSearchParams();

  if (typeof query.period === "string") {
    params.set("period", query.period);
  }

  if (typeof query.from === "string" && query.from.trim().length > 0) {
    params.set("from", query.from.trim());
  }

  if (typeof query.to === "string" && query.to.trim().length > 0) {
    params.set("to", query.to.trim());
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
    throw new DashboardBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

export async function getFinancialDashboardWithBackend(
  accessToken: string,
  query: FinancialDashboardQuery,
): Promise<FinancialDashboard> {
  const queryString = buildQueryString(query);
  const response = await fetch(buildBackendUrl(`dashboard/financial${queryString}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsFinancialDashboard);
}
