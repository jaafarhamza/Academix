import "server-only";

import type {
  Room,
  RoomCreatePayload,
  RoomDetail,
  RoomListQuery,
  RoomSchedule,
  RoomUpdatePayload,
} from "../types/room.types";

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

function assertIsRoomDetail(payload: unknown): asserts payload is RoomDetail {
  assertIsRoomRecord(payload);

  const value = payload as Record<string, unknown>;
  if (
    typeof value.sessionsCount !== "number" ||
    !Number.isFinite(value.sessionsCount)
  ) {
    throw new Error("Invalid room detail payload");
  }
}

function assertIsRoomScheduleSessionRecord(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid room schedule payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.day !== "string" ||
    typeof value.start !== "string" ||
    typeof value.end !== "string" ||
    typeof value.status !== "string" ||
    typeof value.subject_id !== "string" ||
    typeof value.subjectName !== "string" ||
    typeof value.teacher_id !== "string" ||
    typeof value.teacherName !== "string"
  ) {
    throw new Error("Invalid room schedule payload");
  }

  if (
    value.student_id !== null &&
    typeof value.student_id !== "string"
  ) {
    throw new Error("Invalid room schedule payload");
  }

  if (
    value.studentName !== null &&
    typeof value.studentName !== "string"
  ) {
    throw new Error("Invalid room schedule payload");
  }

  if (
    value.student_group_id !== null &&
    typeof value.student_group_id !== "string"
  ) {
    throw new Error("Invalid room schedule payload");
  }

  if (
    value.studentGroupName !== null &&
    typeof value.studentGroupName !== "string"
  ) {
    throw new Error("Invalid room schedule payload");
  }
}

function assertIsRoomSchedule(payload: unknown): asserts payload is RoomSchedule {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid room schedule payload");
  }

  const value = payload as Record<string, unknown>;
  if (
    typeof value.room_id !== "string" ||
    typeof value.roomName !== "string" ||
    typeof value.floor !== "number" ||
    typeof value.isAvailable !== "boolean" ||
    typeof value.totalSessions !== "number" ||
    !Array.isArray(value.sessions)
  ) {
    throw new Error("Invalid room schedule payload");
  }

  for (const session of value.sessions) {
    assertIsRoomScheduleSessionRecord(session);
  }
}

type RoomDetailLike = {
  id: string;
};

function assertIsRoomDetailLike(payload: unknown): asserts payload is RoomDetailLike {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid room payload");
  }

  const value = payload as Record<string, unknown>;
  if (typeof value.id !== "string") {
    throw new Error("Invalid room payload");
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

export async function createRoomWithBackend(
  accessToken: string,
  payload: RoomCreatePayload,
): Promise<Room> {
  const response = await fetch(buildBackendUrl("rooms"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBackendResponse(response, assertIsRoomRecord);
}

export async function updateRoomWithBackend(
  accessToken: string,
  roomId: string,
  payload: RoomUpdatePayload,
): Promise<RoomDetailLike> {
  const normalizedRoomId = roomId.trim();

  const response = await fetch(buildBackendUrl(`rooms/${normalizedRoomId}`), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBackendResponse(response, assertIsRoomDetailLike);
}

export async function getRoomByIdWithBackend(
  accessToken: string,
  roomId: string,
): Promise<RoomDetail> {
  const normalizedRoomId = roomId.trim();

  const response = await fetch(buildBackendUrl(`rooms/${normalizedRoomId}`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsRoomDetail);
}

export async function getRoomScheduleWithBackend(
  accessToken: string,
  roomId: string,
): Promise<RoomSchedule> {
  const normalizedRoomId = roomId.trim();

  const response = await fetch(buildBackendUrl(`rooms/${normalizedRoomId}/schedule`), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return parseBackendResponse(response, assertIsRoomSchedule);
}

export async function deleteRoomWithBackend(
  accessToken: string,
  roomId: string,
): Promise<void> {
  const normalizedRoomId = roomId.trim();

  const response = await fetch(buildBackendUrl(`rooms/${normalizedRoomId}`), {
    method: "DELETE",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (response.ok) {
    return;
  }

  const payload = await parseResponsePayload(response);
  throw new RoomBackendError({
    status: response.status,
    message: parseApiErrorMessage(payload),
  });
}
