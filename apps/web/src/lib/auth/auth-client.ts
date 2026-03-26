import type { AxiosError } from "axios";

import { clientEnv } from "@/lib/env/client-env";
import { apiClient } from "@/lib/http";
import type { AuthUser, UserRole } from "@/stores";
import { clearAccessToken, setAccessToken } from "./token-storage";

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResult = {
  accessToken: string;
  user: AuthUser;
};

function getObjectValue(
  value: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    const found = value[key];

    if (found !== undefined && found !== null) {
      return found;
    }
  }

  return null;
}

function getStringValue(
  value: Record<string, unknown>,
  keys: string[],
): string | null {
  const found = getObjectValue(value, keys);

  if (typeof found === "string") {
    const trimmed = found.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

function normalizeRole(value: string | null): UserRole | undefined {
  if (!value) {
    return undefined;
  }

  const role = value.toUpperCase();

  if (
    role === "ADMIN" ||
    role === "SECRETARY" ||
    role === "TEACHER" ||
    role === "STUDENT" ||
    role === "SUPER_ADMIN"
  ) {
    return role;
  }

  return undefined;
}

function normalizeAuthUser(candidate: unknown): AuthUser | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const payload = candidate as Record<string, unknown>;
  const id = getStringValue(payload, ["id", "user_id", "userId", "sub"]);

  if (!id) {
    return null;
  }

  return {
    id,
    centerId: getStringValue(payload, ["center_id", "centerId"]) ?? undefined,
    role: normalizeRole(getStringValue(payload, ["role"])),
    fullName:
      getStringValue(payload, ["full_name", "fullName", "name"]) ?? undefined,
    email: getStringValue(payload, ["email"]) ?? undefined,
  };
}

function extractAccessToken(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;

  const directToken = getStringValue(payload, [
    "accessToken",
    "access_token",
    "token",
  ]);

  if (directToken) {
    return directToken;
  }

  const nestedData = payload.data;

  if (!nestedData || typeof nestedData !== "object") {
    return null;
  }

  return getStringValue(nestedData as Record<string, unknown>, [
    "accessToken",
    "access_token",
    "token",
  ]);
}

function decodeJwtPayload(accessToken: string) {
  if (typeof window === "undefined" || typeof window.atob !== "function") {
    return null;
  }

  const parts = accessToken.split(".");

  if (parts.length < 2) {
    return null;
  }

  const payload = parts[1];
  const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
  const paddedPayload = normalizedPayload.padEnd(
    Math.ceil(normalizedPayload.length / 4) * 4,
    "=",
  );

  try {
    const decoded = window.atob(paddedPayload);
    const parsed = JSON.parse(decoded);

    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function extractAuthUser(data: unknown, accessToken: string): AuthUser | null {
  if (data && typeof data === "object") {
    const payload = data as Record<string, unknown>;
    const directUser = normalizeAuthUser(payload.user);

    if (directUser) {
      return directUser;
    }

    if (payload.data && typeof payload.data === "object") {
      const nestedData = payload.data as Record<string, unknown>;
      const nestedUser = normalizeAuthUser(nestedData.user ?? nestedData);

      if (nestedUser) {
        return nestedUser;
      }
    }
  }

  return normalizeAuthUser(decodeJwtPayload(accessToken));
}

export async function loginWithPassword(
  credentials: LoginCredentials,
): Promise<LoginResult> {
  const response = await apiClient.post(clientEnv.authLoginPath, credentials, {
    skipAuth: true,
  });

  const accessToken = extractAccessToken(response.data);

  if (!accessToken) {
    throw new Error("Login response does not include an access token");
  }

  const user = extractAuthUser(response.data, accessToken);

  if (!user) {
    throw new Error("Login response does not include a valid user payload");
  }

  setAccessToken(accessToken);

  return {
    accessToken,
    user,
  };
}

export async function logoutSession() {
  try {
    await apiClient.post(clientEnv.authLogoutPath, undefined, {
      skipAuth: true,
    });
  } finally {
    clearAccessToken();
  }
}

export function getErrorMessage(error: unknown) {
  const fallbackMessage = "Something went wrong. Please try again.";

  if (!error) {
    return fallbackMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  const axiosError = error as AxiosError<{ message?: string }>;
  const apiMessage = axiosError.response?.data?.message;

  if (typeof apiMessage === "string" && apiMessage.trim().length > 0) {
    return apiMessage;
  }

  return fallbackMessage;
}
