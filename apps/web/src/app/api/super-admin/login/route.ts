import { NextResponse } from "next/server";
import {
  loginSuperAdminWithBackend,
  SuperAdminBackendError,
} from "@/modules/super-admin/server/super-admin-auth.dal";
import {
  setSuperAdminRefreshCookie,
  setSuperAdminSessionCookie,
} from "@/modules/super-admin/server/super-admin-session-cookie";
import type { SuperAdminCredentials } from "@/modules/super-admin/types/super-admin-auth.types";

function isValidCredentials(payload: unknown): payload is SuperAdminCredentials {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const body = payload as Record<string, unknown>;
  return (
    typeof body.email === "string" &&
    body.email.trim().length > 0 &&
    typeof body.password === "string" &&
    body.password.length > 0
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (!isValidCredentials(payload)) {
      return NextResponse.json(
        { message: "Invalid credentials payload" },
        { status: 400 },
      );
    }

    const { auth, refreshToken } = await loginSuperAdminWithBackend({
      email: payload.email.trim(),
      password: payload.password,
    });

    if (!refreshToken) {
      return NextResponse.json(
        { message: "Login succeeded but refresh cookie is missing" },
        { status: 502 },
      );
    }

    const response = NextResponse.json(auth, { status: 200 });
    setSuperAdminRefreshCookie(response, refreshToken);
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
      { message: "Unable to complete super admin login" },
      { status: 500 },
    );
  }
}
