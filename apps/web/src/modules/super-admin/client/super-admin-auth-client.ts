"use client";

import type {
  SuperAdminAuthResponse,
  SuperAdminCredentials,
  SuperAdminProfile,
} from "../types/super-admin-auth.types";
import {
  clearSuperAdminAccessToken,
  getSuperAdminAccessToken,
  setSuperAdminAccessToken,
} from "./super-admin-token-storage";

const superAdminApiBasePath = "/api/super-admin";

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

async function parseSuperAdminApiResponse<T>(
  response: Response,
  fallbackMessage: string,
) {
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(extractMessageFromPayload(payload) ?? fallbackMessage);
  }

  return payload as T;
}

export async function loginSuperAdmin(
  credentials: SuperAdminCredentials,
): Promise<SuperAdminAuthResponse> {
  const response = await fetch(`${superAdminApiBasePath}/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const payload = await parseSuperAdminApiResponse<SuperAdminAuthResponse>(
    response,
    "Unable to login as super admin",
  );
  setSuperAdminAccessToken(payload.accessToken);
  return payload;
}

export async function refreshSuperAdminSession(): Promise<SuperAdminAuthResponse> {
  const response = await fetch(`${superAdminApiBasePath}/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await parseSuperAdminApiResponse<SuperAdminAuthResponse>(
    response,
    "Unable to refresh super admin session",
  );
  setSuperAdminAccessToken(payload.accessToken);
  return payload;
}

export async function getSuperAdminProfile(
  accessToken: string,
): Promise<SuperAdminProfile> {
  const response = await fetch(`${superAdminApiBasePath}/profile`, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseSuperAdminApiResponse<SuperAdminProfile>(
    response,
    "Unable to load super admin profile",
  );
}

export async function ensureSuperAdminSession(): Promise<{
  auth: SuperAdminAuthResponse;
  profile: SuperAdminProfile | null;
}> {
  const auth = await refreshSuperAdminSession();
  let profile: SuperAdminProfile | null = null;

  try {
    profile = await getSuperAdminProfile(auth.accessToken);
  } catch {
    profile = null;
  }

  return {
    auth,
    profile,
  };
}

export async function logoutSuperAdmin() {
  try {
    await fetch(`${superAdminApiBasePath}/logout`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    clearSuperAdminAccessToken();
  }
}

export function getCurrentSuperAdminAccessToken() {
  return getSuperAdminAccessToken();
}
