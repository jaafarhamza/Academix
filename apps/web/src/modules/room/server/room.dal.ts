import "server-only";

import type { Room, RoomListQuery } from "../types/room.types";

const defaultBackendBaseUrl = "http://localhost:3001";
const maxPageSize = 100;

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

  if (Array.isArray(message)) {
    const firstMessage = message.find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );
    if (firstMessage) {
      return firstMessage;
    }
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

export class RoomBackendError extends Error {
  status: number;

  constructor(payload: BackendErrorShape) {
    super(payload.message);
    this.name = "RoomBackendError";
    this.status = payload.status;
  }
}

function assertIsRoomRecord(payload: unknown): asserts payload is Room {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid room payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.center_id !== "string" ||
    typeof value.floor !== "number" ||
    !Number.isInteger(value.floor) ||
    typeof value.roomName !== "string" ||
    typeof value.isAvailable !== "boolean"
  ) {
    throw new Error("Invalid room payload");
  }
}

function assertIsRoomList(payload: unknown): asserts payload is Room[] {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid rooms list payload");
  }

  for (const row of payload) {
    assertIsRoomRecord(row);
  }
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

  const result = params.toString();
  return result.length > 0 ? `?${result}` : "";
}

async function parseBackendResponse<T>(
  response: Response,
  validator: (payload: unknown) => asserts payload is T,
) {
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new RoomBackendError({
      status: response.status,
      message: parseApiErrorMessage(payload),
    });
  }

  validator(payload);
  return payload;
}

export async function getRoomsWithBackend(
  accessToken: string,
  query: RoomListQuery,
): Promise<Room[]> {
  const queryString = buildRoomsQueryString(query);

  const response = await fetch(buildBackendUrl(`rooms${queryString}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsRoomList);
}
