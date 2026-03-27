import { NextResponse } from "next/server";
import {
  CenterBackendError,
  loginCenterWithBackend,
} from "@/modules/center/server/center-auth.dal";
import {
  setCenterRefreshCookie,
  setCenterSessionCookie,
} from "@/modules/center/server/center-session-cookie";
import type { CenterCredentials } from "@/modules/center/types/center-auth.types";

function isValidCredentials(payload: unknown): payload is CenterCredentials {
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

    const { auth, refreshToken } = await loginCenterWithBackend({
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
    setCenterRefreshCookie(response, refreshToken);
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
      { message: "Unable to complete center login" },
      { status: 500 },
    );
  }
}
