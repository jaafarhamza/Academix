"use client";

import {
  getCurrentCenterAccessToken,
  refreshCenterSession,
} from "@/modules/center/client/center-auth-client";
import type {
  FinancialDashboard,
  FinancialDashboardQuery,
} from "../types/dashboard.types";

const financialDashboardApiBasePath = "/api/dashboard/financial";

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

async function parseDashboardApiResponse<T>(
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

export async function getFinancialDashboard(
  query: FinancialDashboardQuery,
): Promise<FinancialDashboard> {
  const accessToken = await getRequiredCenterAccessToken();
  const response = await fetch(
    `${financialDashboardApiBasePath}${buildQueryString(query)}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  return parseDashboardApiResponse<FinancialDashboard>(
    response,
    "Unable to load financial dashboard",
  );
}
