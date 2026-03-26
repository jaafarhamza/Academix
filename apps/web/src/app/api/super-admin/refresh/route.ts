import { NextRequest, NextResponse } from "next/server";
import {
  refreshSuperAdminWithBackend,
  SuperAdminBackendError,
} from "@/modules/super-admin/server/super-admin-auth.dal";
import {
  readSuperAdminRefreshCookie,
  setSuperAdminRefreshCookie,
  setSuperAdminSessionCookie,
} from "@/modules/super-admin/server/super-admin-session-cookie";

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

    const cookieRefreshToken = readSuperAdminRefreshCookie(request);
    const bodyRefreshToken = parseBodyRefreshToken(bodyPayload);
    const refreshToken = cookieRefreshToken ?? bodyRefreshToken;

    if (!refreshToken) {
      return NextResponse.json(
        { message: "Missing refresh token" },
        { status: 401 },
      );
    }

    const { auth, refreshToken: rotatedRefreshToken } =
      await refreshSuperAdminWithBackend(refreshToken);
    const response = NextResponse.json(auth, { status: 200 });

    setSuperAdminRefreshCookie(response, rotatedRefreshToken ?? refreshToken);
    setSuperAdminSessionCookie(response);
    return response;
  } catch (error: unknown) {
    if (error instanceof SuperAdminBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to refresh super admin session" },
      { status: 500 },
    );
  }
}
