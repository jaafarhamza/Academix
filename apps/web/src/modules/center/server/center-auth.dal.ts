import "server-only";

import type {
  CenterAuthResponse,
  CenterCredentials,
  CenterLogoUploadResponse,
  CenterPasswordUpdatePayload,
  CenterProfile,
  CenterProfileUpdatePayload,
  CenterRegistrationPayload,
  CenterRegistrationResponse,
} from "../types/center-auth.types";
import { extractRefreshTokenFromSetCookieHeaders } from "./center-session-cookie";

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
  if (!payload || typeof payload !== "object") {
    return "Request failed";
  }

  const objectPayload = payload as Record<string, unknown>;
  const message = objectPayload.message;

  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  if (message && typeof message === "object") {
    const nestedMessage = (message as Record<string, unknown>).message as
      | string
      | string[]
      | undefined;

    if (typeof nestedMessage === "string" && nestedMessage.trim().length > 0) {
      return nestedMessage;
    }

    if (Array.isArray(nestedMessage)) {
      const firstStringMessage = nestedMessage.find(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      );
      if (firstStringMessage) {
        return firstStringMessage;
      }
    }
  }

  return "Request failed";
}

type BackendErrorShape = {
  status: number;
  message: string;
};

export class CenterBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "CenterBackendError";
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
  auth: CenterAuthResponse;
  refreshToken: string | null;
};

function assertIsCenterAuthResponse(payload: unknown): asserts payload is CenterAuthResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid center auth response payload");
  }

  const objectPayload = payload as Record<string, unknown>;
  const center = objectPayload.center as Record<string, unknown> | null;

  if (
    typeof objectPayload.accessToken !== "string" ||
    typeof objectPayload.expiresIn !== "string" ||
    typeof objectPayload.tokenType !== "string" ||
    !center ||
    typeof center.id !== "string" ||
    typeof center.centerName !== "string" ||
    typeof center.email !== "string" ||
    typeof center.subdomain !== "string" ||
    center.role !== "ADMIN"
  ) {
    throw new Error("Invalid center auth response payload");
  }
}

function assertIsCenterProfile(payload: unknown): asserts payload is CenterProfile {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid center profile payload");
  }

  const objectPayload = payload as Record<string, unknown>;
  if (
    typeof objectPayload.id !== "string" ||
    typeof objectPayload.firstName !== "string" ||
    typeof objectPayload.lastName !== "string" ||
    typeof objectPayload.centerName !== "string" ||
    typeof objectPayload.email !== "string" ||
    typeof objectPayload.phone !== "string" ||
    (objectPayload.logoUrl !== null && typeof objectPayload.logoUrl !== "string") ||
    typeof objectPayload.subdomain !== "string" ||
    typeof objectPayload.isActive !== "boolean" ||
    typeof objectPayload.createdAt !== "string"
  ) {
    throw new Error("Invalid center profile payload");
  }
}

function assertIsCenterRegistrationResponse(
  payload: unknown,
): asserts payload is CenterRegistrationResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid center registration response payload");
  }

  const objectPayload = payload as Record<string, unknown>;
  if (
    typeof objectPayload.id !== "string" ||
    typeof objectPayload.firstName !== "string" ||
    typeof objectPayload.lastName !== "string" ||
    typeof objectPayload.centerName !== "string" ||
    typeof objectPayload.email !== "string" ||
    typeof objectPayload.phone !== "string" ||
    (objectPayload.logoUrl !== null && typeof objectPayload.logoUrl !== "string") ||
    typeof objectPayload.subdomain !== "string" ||
    typeof objectPayload.isActive !== "boolean" ||
    typeof objectPayload.createdAt !== "string"
  ) {
    throw new Error("Invalid center registration response payload");
  }
}

function assertIsCenterLogoUploadResponse(
  payload: unknown,
): asserts payload is CenterLogoUploadResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid center logo upload response payload");
  }

  const objectPayload = payload as Record<string, unknown>;
  if (typeof objectPayload.logoUrl !== "string" || objectPayload.logoUrl.length === 0) {
    throw new Error("Invalid center logo upload response payload");
  }
}

function assertIsCenterProfileUpdateResponse(
  payload: unknown,
): asserts payload is CenterProfile {
  assertIsCenterProfile(payload);
}

function isValidOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateCenterProfileUpdatePayload(payload: CenterProfileUpdatePayload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid center profile update payload");
  }

  const values = Object.values(payload);
  if (values.length === 0) {
    throw new Error("At least one profile field is required");
  }

  const supportedFields = ["firstName", "lastName", "centerName", "email", "phone"];
  for (const [key, value] of Object.entries(payload)) {
    if (!supportedFields.includes(key)) {
      throw new Error("Invalid center profile update payload");
    }

    if (!isValidOptionalString(value)) {
      throw new Error("Invalid center profile update payload");
    }
  }
}

function validateCenterPasswordUpdatePayload(payload: CenterPasswordUpdatePayload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid center password payload");
  }

  if (
    !isValidOptionalString(payload.currentPassword) ||
    !isValidOptionalString(payload.newPassword) ||
    !isValidOptionalString(payload.confirmPassword)
  ) {
    throw new Error("Invalid center password payload");
  }
}

async function parseBackendResponse<T>(
  response: Response,
  validator: (payload: unknown) => asserts payload is T,
) {
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new CenterBackendError({
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

export async function registerCenterWithBackend(
  payload: CenterRegistrationPayload,
): Promise<CenterRegistrationResponse> {
  const response = await postToBackend("centers/register", payload);
  return parseBackendResponse(response, assertIsCenterRegistrationResponse);
}

export async function loginCenterWithBackend(
  credentials: CenterCredentials,
): Promise<AuthResponseWithRefreshToken> {
  const response = await postToBackend("centers/login", credentials);
  const auth = await parseBackendResponse(response, assertIsCenterAuthResponse);
  const refreshToken = extractRefreshTokenFromSetCookieHeaders(
    readSetCookieHeaders(response.headers),
  );

  return {
    auth,
    refreshToken,
  };
}

export async function refreshCenterWithBackend(
  refreshToken: string,
): Promise<AuthResponseWithRefreshToken> {
  const response = await postToBackend("centers/refresh", {
    refreshToken,
  });
  const auth = await parseBackendResponse(response, assertIsCenterAuthResponse);
  const rotatedRefreshToken = extractRefreshTokenFromSetCookieHeaders(
    readSetCookieHeaders(response.headers),
  );

  return {
    auth,
    refreshToken: rotatedRefreshToken,
  };
}

export async function logoutCenterWithBackend(refreshToken: string | null): Promise<void> {
  await postToBackend("centers/logout", {
    refreshToken: refreshToken ?? undefined,
  });
}

export async function getCenterProfileWithBackend(accessToken: string): Promise<CenterProfile> {
  const response = await fetch(buildBackendUrl("centers/profile"), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsCenterProfile);
}

export async function uploadCenterLogoWithBackend(
  accessToken: string,
  file: File,
): Promise<CenterLogoUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(buildBackendUrl("centers/logo"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    body: formData,
  });

  return parseBackendResponse(response, assertIsCenterLogoUploadResponse);
}

export async function updateCenterProfileWithBackend(
  accessToken: string,
  payload: CenterProfileUpdatePayload,
): Promise<CenterProfile> {
  validateCenterProfileUpdatePayload(payload);

  const response = await fetch(buildBackendUrl("centers/profile"), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBackendResponse(response, assertIsCenterProfileUpdateResponse);
}

export async function updateCenterPasswordWithBackend(
  accessToken: string,
  payload: CenterPasswordUpdatePayload,
): Promise<void> {
  validateCenterPasswordUpdatePayload(payload);

  const response = await fetch(buildBackendUrl("centers/profile/password"), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responsePayload = await parseResponsePayload(response);
    throw new CenterBackendError({
      status: response.status,
      message: parseApiErrorMessage(responsePayload),
    });
  }
}
