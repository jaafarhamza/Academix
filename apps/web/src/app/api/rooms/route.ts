import { NextRequest, NextResponse } from "next/server";
import {
  getRoomsWithBackend,
  RoomBackendError,
} from "@/modules/room/server/room.dal";
import type { RoomListQuery } from "@/modules/room/types/room.types";

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

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseNonNegativeInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
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
