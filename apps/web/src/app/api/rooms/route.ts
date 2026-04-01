import { NextRequest, NextResponse } from "next/server";
import {
  createRoomWithBackend,
  getRoomsWithBackend,
  RoomBackendError,
} from "@/modules/room/server/room.dal";
import type {
  RoomCreatePayload,
  RoomListQuery,
} from "@/modules/room/types/room.types";

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseNonNegativeInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseIsAvailable(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return undefined;
}

function parseQuery(request: NextRequest): RoomListQuery {
  const searchValue = request.nextUrl.searchParams.get("search");
  const normalizedSearch =
    typeof searchValue === "string" && searchValue.trim().length > 0
      ? searchValue.trim()
      : undefined;

  return {
    search: normalizedSearch,
    floor: parseNonNegativeInteger(request.nextUrl.searchParams.get("floor")),
    isAvailable: parseIsAvailable(request.nextUrl.searchParams.get("isAvailable")),
    page: parsePositiveInteger(request.nextUrl.searchParams.get("page")),
    limit: parsePositiveInteger(request.nextUrl.searchParams.get("limit")),
  };
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return undefined;
}

function parseCreatePayload(payload: unknown): RoomCreatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const floor =
    typeof body.floor === "number"
      ? body.floor
      : typeof body.floor === "string"
        ? Number(body.floor.trim())
        : Number.NaN;
  const roomName =
    typeof body.roomName === "string" ? body.roomName.trim() : "";

  if (!Number.isInteger(floor) || floor < 0 || roomName.length === 0) {
    return null;
  }

  const result: RoomCreatePayload = {
    floor,
    roomName,
  };

  const isAvailable = parseOptionalBoolean(body.isAvailable);
  if (isAvailable !== undefined) {
    result.isAvailable = isAvailable;
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const rooms = await getRoomsWithBackend(accessToken, parseQuery(request));
    return NextResponse.json(rooms, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof RoomBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load rooms" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const payload = await request.json();
    const createPayload = parseCreatePayload(payload);
    if (!createPayload) {
      return NextResponse.json(
        { message: "Invalid room payload" },
        { status: 400 },
      );
    }

    const room = await createRoomWithBackend(accessToken, createPayload);
    return NextResponse.json(room, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof RoomBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to create room" },
      { status: 500 },
    );
  }
}
