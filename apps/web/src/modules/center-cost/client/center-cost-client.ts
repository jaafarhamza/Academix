"use client";

import {
  getCurrentCenterAccessToken,
  refreshCenterSession,
} from "@/modules/center/client/center-auth-client";
import type { CenterCost, CenterCostListQuery } from "../types/center-cost.types";

const centerCostsApiBasePath = "/api/center-costs";
const ongoingCenterCostRequests = new Map<string, Promise<CenterCost[]>>();

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

function extractMessageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeMessage = (payload as Record<string, unknown>).message;
  if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
    return maybeMessage;
  }

  if (Array.isArray(maybeMessage)) {
    const firstMessage = maybeMessage.find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

    if (firstMessage) {
      return firstMessage;
    }
  }

  return null;
}

async function parseCenterCostsApiResponse<T>(
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

function buildQueryString(query: CenterCostListQuery) {
  const params = new URLSearchParams();

  if (typeof query.scope === "string" && query.scope.trim().length > 0) {
    params.set("scope", query.scope.trim().toUpperCase());
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

export async function listCenterCosts(query: CenterCostListQuery): Promise<CenterCost[]> {
  const queryKey = buildQueryString(query);
  const existingRequest = ongoingCenterCostRequests.get(queryKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const accessToken = await getRequiredCenterAccessToken();
    const response = await fetch(`${centerCostsApiBasePath}${queryKey}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return parseCenterCostsApiResponse<CenterCost[]>(
      response,
      "Unable to load center costs",
    );
  })();

  ongoingCenterCostRequests.set(queryKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    ongoingCenterCostRequests.delete(queryKey);
  }
}

export async function toggleCenterCostActive(centerCostId: string): Promise<CenterCost> {
  const normalizedCenterCostId = centerCostId.trim();
  if (!normalizedCenterCostId) {
    throw new Error("Center cost id is required.");
  }

  const accessToken = await getRequiredCenterAccessToken();
  const response = await fetch(
    `${centerCostsApiBasePath}/${encodeURIComponent(normalizedCenterCostId)}/toggle-active`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  return parseCenterCostsApiResponse<CenterCost>(
    response,
    "Unable to update center cost status",
  );
}
