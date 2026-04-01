import { NextRequest, NextResponse } from "next/server";
import {
  deleteRoomWithBackend,
  getRoomByIdWithBackend,
  RoomBackendError,
  updateRoomWithBackend,
} from "@/modules/room/server/room.dal";
import type { RoomUpdatePayload } from "@/modules/room/types/room.types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

function parseOptionalInteger(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }

    const parsed = Number(normalized);
    return Number.isInteger(parsed) ? parsed : undefined;
  }

  return undefined;
}

function parseOptionalTextField(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
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

function parseUpdatePayload(payload: unknown): RoomUpdatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const result: RoomUpdatePayload = {};

  if ("floor" in body) {
    const floor = parseOptionalInteger(body.floor);
    if (floor === undefined || floor < 0) {
      return null;
    }
    result.floor = floor;
  }

  if ("roomName" in body) {
    const roomName = parseOptionalTextField(body.roomName);
    if (!roomName) {
      return null;
    }
    result.roomName = roomName;
  }

  if ("isAvailable" in body) {
    const isAvailable = parseOptionalBoolean(body.isAvailable);
    if (isAvailable === undefined) {
      return null;
    }
    result.isAvailable = isAvailable;
  }

  return Object.keys(result).length > 0 ? result : null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const roomId = id.trim();
    if (!roomId) {
      return NextResponse.json({ message: "Invalid room id" }, { status: 400 });
    }

    const payload = await request.json();
    const updatePayload = parseUpdatePayload(payload);
    if (!updatePayload) {
      return NextResponse.json(
        { message: "Invalid room update payload" },
        { status: 400 },
      );
    }

    const room = await updateRoomWithBackend(accessToken, roomId, updatePayload);
    return NextResponse.json(room, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof RoomBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to update room" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const roomId = id.trim();
    if (!roomId) {
      return NextResponse.json({ message: "Invalid room id" }, { status: 400 });
    }

    const room = await getRoomByIdWithBackend(accessToken, roomId);
    return NextResponse.json(room, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof RoomBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load room details" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const roomId = id.trim();
    if (!roomId) {
      return NextResponse.json({ message: "Invalid room id" }, { status: 400 });
    }

    await deleteRoomWithBackend(accessToken, roomId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof RoomBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to delete room" },
      { status: 500 },
    );
  }
}
