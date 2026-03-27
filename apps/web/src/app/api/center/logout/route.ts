import { NextRequest, NextResponse } from "next/server";
import { logoutCenterWithBackend } from "@/modules/center/server/center-auth.dal";
import {
  clearCenterRefreshCookie,
  clearCenterSessionCookie,
  readCenterRefreshCookie,
} from "@/modules/center/server/center-session-cookie";

export async function POST(request: NextRequest) {
  const refreshToken = readCenterRefreshCookie(request);

  try {
    await logoutCenterWithBackend(refreshToken);
  } catch {}

  const response = new NextResponse(null, { status: 204 });
  clearCenterRefreshCookie(response);
  clearCenterSessionCookie(response);
  return response;
}
