import "server-only";

import type {
  CenterCost,
  CenterCostDeductionType,
  CenterCostListQuery,
  CenterCostScope,
  CenterCostScopeFilter,
} from "../types/center-cost.types";

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

export class CenterCostBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "CenterCostBackendError";
    this.status = payload.status;
  }
}

function isDeductionType(value: unknown): value is CenterCostDeductionType {
  return (
    value === "PERCENTAGE_OF_TOTAL" ||
    value === "PERCENTAGE_PER_STUDENT" ||
    value === "FIXED_PER_STUDENT"
  );
}

function isScope(value: unknown): value is CenterCostScope {
  return value === "GLOBAL" || value === "PER_TEACHER";
}

function isScopeFilter(value: unknown): value is CenterCostScopeFilter {
  return value === "ALL" || value === "GLOBAL" || value === "PER_TEACHER";
}

function assertIsCenterCost(payload: unknown): asserts payload is CenterCost {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid center cost payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.center_id !== "string" ||
    (value.teacher_id !== null && typeof value.teacher_id !== "string") ||
    (value.teacherName !== null && typeof value.teacherName !== "string") ||
    typeof value.name !== "string" ||
    !isDeductionType(value.deduction_type) ||
    !isScope(value.scope) ||
    typeof value.value !== "number" ||
    typeof value.is_active !== "boolean" ||
    typeof value.created_at !== "string"
  ) {
    throw new Error("Invalid center cost payload");
  }
}

function assertIsCenterCostList(payload: unknown): asserts payload is CenterCost[] {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid center costs payload");
  }

  for (const row of payload) {
    assertIsCenterCost(row);
  }
}

function buildQueryString(query: CenterCostListQuery) {
  const params = new URLSearchParams();

  if (isScopeFilter(query.scope)) {
    params.set("scope", query.scope);
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
    throw new CenterCostBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

export async function getCenterCostsWithBackend(
  accessToken: string,
  query: CenterCostListQuery,
): Promise<CenterCost[]> {
  const queryString = buildQueryString(query);
  const response = await fetch(buildBackendUrl(`center-costs${queryString}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsCenterCostList);
}

export async function toggleCenterCostActiveWithBackend(
  accessToken: string,
  centerCostId: string,
): Promise<CenterCost> {
  const normalizedCenterCostId = centerCostId.trim();
  const response = await fetch(
    buildBackendUrl(`center-costs/${normalizedCenterCostId}/toggle-active`),
    {
      method: "PATCH",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  return parseBackendResponse(response, assertIsCenterCost);
}
