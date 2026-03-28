import { NextRequest, NextResponse } from "next/server";
import {
  CenterBackendError,
  updateCenterPasswordWithBackend,
} from "@/modules/center/server/center-auth.dal";
import type { CenterPasswordUpdatePayload } from "@/modules/center/types/center-auth.types";

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

function parsePasswordPayload(payload: unknown): CenterPasswordUpdatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword.trim() : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword.trim() : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword.trim() : "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return null;
  }

  return {
    currentPassword,
    newPassword,
    confirmPassword,
  };
}

export async function PATCH(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const payload = await request.json();
    const passwordPayload = parsePasswordPayload(payload);

    if (!passwordPayload) {
      return NextResponse.json(
        { message: "Invalid center password payload" },
        { status: 400 },
      );
    }

    await updateCenterPasswordWithBackend(accessToken, passwordPayload);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof CenterBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to update center password" },
      { status: 500 },
    );
  }
}
