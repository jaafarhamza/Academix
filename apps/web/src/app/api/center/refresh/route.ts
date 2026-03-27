import { NextRequest, NextResponse } from "next/server";
import {
  CenterBackendError,
  refreshCenterWithBackend,
} from "@/modules/center/server/center-auth.dal";
import {
  readCenterRefreshCookie,
  setCenterRefreshCookie,
  setCenterSessionCookie,
} from "@/modules/center/server/center-session-cookie";

function parseBodyRefreshToken(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const value = (payload as Record<string, unknown>).refreshToken;
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function POST(request: NextRequest) {
  try {
    let bodyPayload: unknown = null;

    try {
      bodyPayload = await request.json();
    } catch {
      bodyPayload = null;
    }

    const cookieRefreshToken = readCenterRefreshCookie(request);
    const bodyRefreshToken = parseBodyRefreshToken(bodyPayload);
    const refreshToken = cookieRefreshToken ?? bodyRefreshToken;

    if (!refreshToken) {
      return NextResponse.json(
        { message: "Missing refresh token" },
        { status: 401 },
      );
    }

    const { auth, refreshToken: rotatedRefreshToken } =
      await refreshCenterWithBackend(refreshToken);
    const response = NextResponse.json(auth, { status: 200 });

    setCenterRefreshCookie(response, rotatedRefreshToken ?? refreshToken);
    setCenterSessionCookie(response);
    return response;
  } catch (error: unknown) {
    if (error instanceof CenterBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to refresh center session" },
      { status: 500 },
    );
  }
}
