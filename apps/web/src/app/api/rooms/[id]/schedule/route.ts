import { NextRequest, NextResponse } from "next/server";
import {
  getRoomScheduleWithBackend,
  RoomBackendError,
} from "@/modules/room/server/room.dal";

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

    const schedule = await getRoomScheduleWithBackend(accessToken, roomId);
    return NextResponse.json(schedule, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof RoomBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load room schedule" },
      { status: 500 },
    );
  }
}
