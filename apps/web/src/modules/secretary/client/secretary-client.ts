"use client";

import {
  getCurrentCenterAccessToken,
  refreshCenterSession,
} from "@/modules/center/client/center-auth-client";
import type {
  Secretary,
  SecretaryDetail,
  SecretaryCreatePayload,
  SecretaryListQuery,
  SecretaryUpdatePayload,
} from "../types/secretary.types";

const secretariesApiBasePath = "/api/secretaries";
const ongoingSecretaryListRequests = new Map<string, Promise<Secretary[]>>();

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

async function parseSecretariesApiResponse<T>(
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

  const queryString = params.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

export async function listSecretaries(query: SecretaryListQuery): Promise<Secretary[]> {
  const queryKey = buildSecretariesQueryString(query);
  const existingRequest = ongoingSecretaryListRequests.get(queryKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const accessToken = await getRequiredCenterAccessToken();

    const response = await fetch(`${secretariesApiBasePath}${queryKey}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return parseSecretariesApiResponse<Secretary[]>(
      response,
      "Unable to load secretaries",
    );
  })();

  ongoingSecretaryListRequests.set(queryKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    ongoingSecretaryListRequests.delete(queryKey);
  }
}

export async function createSecretary(
  payload: SecretaryCreatePayload,
): Promise<Secretary> {
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(secretariesApiBasePath, {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseSecretariesApiResponse<Secretary>(
    response,
    "Unable to create secretary",
  );
}

export async function getSecretaryDetail(
  secretaryId: string,
): Promise<SecretaryDetail> {
  const normalizedSecretaryId = secretaryId.trim();
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(`${secretariesApiBasePath}/${normalizedSecretaryId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseSecretariesApiResponse<SecretaryDetail>(
    response,
    "Unable to load secretary details",
  );
}

export async function updateSecretary(
  secretaryId: string,
  payload: SecretaryUpdatePayload,
): Promise<void> {
  const normalizedSecretaryId = secretaryId.trim();
  const accessToken = await getRequiredCenterAccessToken();

  const response = await fetch(`${secretariesApiBasePath}/${normalizedSecretaryId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  await parseSecretariesApiResponse<Record<string, unknown>>(
    response,
    "Unable to update secretary",
  );
}
