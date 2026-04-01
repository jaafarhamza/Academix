"use client";

import {
  getCurrentCenterAccessToken,
  refreshCenterSession,
} from "@/modules/center/client/center-auth-client";
import type { Room, RoomListQuery } from "../types/room.types";

const roomsApiBasePath = "/api/rooms";
const maxPageSize = 100;
const ongoingRoomListRequests = new Map<string, Promise<Room[]>>();

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

async function parseRoomsApiResponse<T>(response: Response, fallbackMessage: string) {
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

function buildRoomsQueryString(query: RoomListQuery) {
  const params = new URLSearchParams();

  if (typeof query.search === "string" && query.search.trim().length > 0) {
    params.set("search", query.search.trim());
  }

  if (typeof query.floor === "number" && Number.isInteger(query.floor) && query.floor >= 0) {
    params.set("floor", String(query.floor));
  }

  if (typeof query.isAvailable === "boolean") {
    params.set("isAvailable", query.isAvailable ? "true" : "false");
  }

  if (typeof query.page === "number" && Number.isInteger(query.page) && query.page > 0) {
    params.set("page", String(query.page));
  }

  if (typeof query.limit === "number" && Number.isInteger(query.limit) && query.limit > 0) {
    params.set("limit", String(Math.min(query.limit, maxPageSize)));
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

export async function listRooms(query: RoomListQuery): Promise<Room[]> {
  const queryKey = buildRoomsQueryString(query);
  const existingRequest = ongoingRoomListRequests.get(queryKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async () => {
    const accessToken = await getRequiredCenterAccessToken();

    const response = await fetch(`${roomsApiBasePath}${queryKey}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    return parseRoomsApiResponse<Room[]>(response, "Unable to load rooms");
  })();

  ongoingRoomListRequests.set(queryKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    ongoingRoomListRequests.delete(queryKey);
  }
}
