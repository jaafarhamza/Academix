import { NextRequest, NextResponse } from "next/server";
import { logoutSuperAdminWithBackend } from "@/modules/super-admin/server/super-admin-auth.dal";
import {
  clearSuperAdminRefreshCookie,
  clearSuperAdminSessionCookie,
  readSuperAdminRefreshCookie,
} from "@/modules/super-admin/server/super-admin-session-cookie";

export async function POST(request: NextRequest) {
  const refreshToken = readSuperAdminRefreshCookie(request);

  try {
    await logoutSuperAdminWithBackend(refreshToken);
  } catch {}

  const response = new NextResponse(null, { status: 204 });
  clearSuperAdminRefreshCookie(response);
  clearSuperAdminSessionCookie(response);
  return response;
}
