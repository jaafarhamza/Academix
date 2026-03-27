"use client";

import type {
  CenterAuthResponse,
  CenterCredentials,
  CenterProfile,
  CenterRegistrationPayload,
  CenterRegistrationResponse,
} from "../types/center-auth.types";
import {
  clearCenterAccessToken,
  getCenterAccessToken,
  setCenterAccessToken,
} from "./center-token-storage";

const centerApiBasePath = "/api/center";

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

async function parseCenterApiResponse<T>(
  response: Response,
  fallbackMessage: string,
) {
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(extractMessageFromPayload(payload) ?? fallbackMessage);
  }

  return payload as T;
}

export async function registerCenter(
  payload: CenterRegistrationPayload,
): Promise<CenterRegistrationResponse> {
  const response = await fetch(`${centerApiBasePath}/register`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseCenterApiResponse<CenterRegistrationResponse>(
    response,
    "Unable to register center",
  );
}

export async function loginCenter(
  credentials: CenterCredentials,
): Promise<CenterAuthResponse> {
  const response = await fetch(`${centerApiBasePath}/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const payload = await parseCenterApiResponse<CenterAuthResponse>(
    response,
    "Unable to login as center admin",
  );
  setCenterAccessToken(payload.accessToken);
  return payload;
}

export async function refreshCenterSession(): Promise<CenterAuthResponse> {
  const response = await fetch(`${centerApiBasePath}/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await parseCenterApiResponse<CenterAuthResponse>(
    response,
    "Unable to refresh center session",
  );
  setCenterAccessToken(payload.accessToken);
  return payload;
}

export async function getCenterProfile(accessToken: string): Promise<CenterProfile> {
  const response = await fetch(`${centerApiBasePath}/profile`, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseCenterApiResponse<CenterProfile>(
    response,
    "Unable to load center profile",
  );
}

export async function ensureCenterSession(): Promise<{
  auth: CenterAuthResponse;
  profile: CenterProfile | null;
}> {
  const auth = await refreshCenterSession();
  let profile: CenterProfile | null = null;

  try {
    profile = await getCenterProfile(auth.accessToken);
  } catch {
    profile = null;
  }

  return {
    auth,
    profile,
  };
}

export async function logoutCenter() {
  try {
    await fetch(`${centerApiBasePath}/logout`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    clearCenterAccessToken();
  }
}

export function getCurrentCenterAccessToken() {
  return getCenterAccessToken();
}
