import "server-only";

import type {
  SuperAdminAuthResponse,
  SuperAdminCredentials,
  SuperAdminProfile,
} from "../types/super-admin-auth.types";
import { extractRefreshTokenFromSetCookieHeaders } from "./super-admin-session-cookie";

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

function readSetCookieHeaders(headers: Headers): string[] {
  const headersWithGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithGetSetCookie.getSetCookie === "function") {
    return headersWithGetSetCookie.getSetCookie();
  }

  const singleHeader = headers.get("set-cookie");
  return singleHeader ? [singleHeader] : [];
}

function parseApiErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object") {
    const objectPayload = payload as Record<string, unknown>;
    const message = objectPayload.message;

    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return "Request failed";
}

type BackendErrorShape = {
  status: number;
  message: string;
};

export class SuperAdminBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "SuperAdminBackendError";
    this.status = payload.status;
  }
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

type AuthResponseWithRefreshToken = {
  auth: SuperAdminAuthResponse;
  refreshToken: string | null;
};

function assertIsSuperAdminAuthResponse(
  payload: unknown,
): asserts payload is SuperAdminAuthResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid super admin auth response payload");
  }

  const objectPayload = payload as Record<string, unknown>;
  const superAdmin = objectPayload.superAdmin as Record<string, unknown> | null;

  if (
    typeof objectPayload.accessToken !== "string" ||
    typeof objectPayload.expiresIn !== "string" ||
    typeof objectPayload.tokenType !== "string" ||
    !superAdmin ||
    typeof superAdmin.id !== "string" ||
    typeof superAdmin.firstName !== "string" ||
    typeof superAdmin.lastName !== "string" ||
    typeof superAdmin.email !== "string"
  ) {
    throw new Error("Invalid super admin auth response payload");
  }
}

function assertIsSuperAdminProfile(
  payload: unknown,
): asserts payload is SuperAdminProfile {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid super admin profile payload");
  }

  const objectPayload = payload as Record<string, unknown>;
  if (
    typeof objectPayload.id !== "string" ||
    typeof objectPayload.firstName !== "string" ||
    typeof objectPayload.lastName !== "string" ||
    typeof objectPayload.email !== "string" ||
    typeof objectPayload.phone !== "string" ||
    typeof objectPayload.isActive !== "boolean" ||
    typeof objectPayload.createdAt !== "string"
  ) {
    throw new Error("Invalid super admin profile payload");
  }
}

async function parseBackendResponse<T>(
  response: Response,
  validator: (payload: unknown) => asserts payload is T,
) {
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new SuperAdminBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

async function postToBackend(path: string, body: unknown) {
  return fetch(buildBackendUrl(path), {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function loginSuperAdminWithBackend(
  credentials: SuperAdminCredentials,
): Promise<AuthResponseWithRefreshToken> {
  const response = await postToBackend("super-admin/login", credentials);
  const auth = await parseBackendResponse(response, assertIsSuperAdminAuthResponse);
  const refreshToken = extractRefreshTokenFromSetCookieHeaders(
    readSetCookieHeaders(response.headers),
  );

  return {
    auth,
    refreshToken,
  };
}

export async function refreshSuperAdminWithBackend(
  refreshToken: string,
): Promise<AuthResponseWithRefreshToken> {
  const response = await postToBackend("super-admin/refresh", {
    refreshToken,
  });
  const auth = await parseBackendResponse(response, assertIsSuperAdminAuthResponse);
  const rotatedRefreshToken = extractRefreshTokenFromSetCookieHeaders(
    readSetCookieHeaders(response.headers),
  );

  return {
    auth,
    refreshToken: rotatedRefreshToken,
  };
}

export async function logoutSuperAdminWithBackend(
  refreshToken: string | null,
): Promise<void> {
  await postToBackend("super-admin/logout", {
    refreshToken: refreshToken ?? undefined,
  });
}

export async function getSuperAdminProfileWithBackend(
  accessToken: string,
): Promise<SuperAdminProfile> {
  const response = await fetch(buildBackendUrl("super-admin/profile"), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsSuperAdminProfile);
}
