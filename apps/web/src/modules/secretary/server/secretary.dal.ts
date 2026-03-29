import "server-only";

import type {
  SecretaryCreatePayload,
  Secretary,
  SecretaryDetail,
  SecretaryListQuery,
  SecretaryUpdatePayload,
} from "../types/secretary.types";

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

export class SecretaryBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "SecretaryBackendError";
    this.status = payload.status;
  }
}

function assertIsSecretaryRecord(payload: unknown): asserts payload is Secretary {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid secretary payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.center_id !== "string" ||
    typeof value.firstName !== "string" ||
    typeof value.lastName !== "string" ||
    typeof value.email !== "string" ||
    typeof value.phone !== "string" ||
    value.role !== "SECRETARY" ||
    (value.cin !== null && typeof value.cin !== "string") ||
    typeof value.isActive !== "boolean" ||
    typeof value.createdAt !== "string"
  ) {
    throw new Error("Invalid secretary payload");
  }
}

function assertIsSecretaryList(payload: unknown): asserts payload is Secretary[] {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid secretaries list payload");
  }

  for (const row of payload) {
    assertIsSecretaryRecord(row);
  }
}

function assertIsSecretaryDetail(payload: unknown): asserts payload is SecretaryDetail {
  assertIsSecretaryRecord(payload);

  const value = payload as Record<string, unknown>;
  if (typeof value.updatedAt !== "string") {
    throw new Error("Invalid secretary detail payload");
  }
}

type SecretaryDetailLike = {
  id: string;
};

function assertIsSecretaryDetailLike(payload: unknown): asserts payload is SecretaryDetailLike {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid secretary detail payload");
  }

  const value = payload as Record<string, unknown>;
  if (typeof value.id !== "string") {
    throw new Error("Invalid secretary detail payload");
  }
}

function buildSecretariesQueryString(query: SecretaryListQuery) {
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
    throw new SecretaryBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

export async function getSecretariesWithBackend(
  accessToken: string,
  query: SecretaryListQuery,
): Promise<Secretary[]> {
  const queryString = buildSecretariesQueryString(query);

  const response = await fetch(buildBackendUrl(`secretaries${queryString}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsSecretaryList);
}

export async function getSecretaryByIdWithBackend(
  accessToken: string,
  secretaryId: string,
): Promise<SecretaryDetail> {
  const normalizedSecretaryId = secretaryId.trim();

  const response = await fetch(
    buildBackendUrl(`secretaries/${normalizedSecretaryId}`),
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  return parseBackendResponse(response, assertIsSecretaryDetail);
}

export async function createSecretaryWithBackend(
  accessToken: string,
  payload: SecretaryCreatePayload,
): Promise<Secretary> {
  const response = await fetch(buildBackendUrl("secretaries"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBackendResponse(response, assertIsSecretaryRecord);
}

export async function updateSecretaryWithBackend(
  accessToken: string,
  secretaryId: string,
  payload: SecretaryUpdatePayload,
): Promise<SecretaryDetailLike> {
  const normalizedSecretaryId = secretaryId.trim();
  const response = await fetch(
    buildBackendUrl(`secretaries/${normalizedSecretaryId}`),
    {
      method: "PATCH",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  return parseBackendResponse(response, assertIsSecretaryDetailLike);
}
