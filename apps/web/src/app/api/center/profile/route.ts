import { NextRequest, NextResponse } from "next/server";
import {
  CenterBackendError,
  getCenterProfileWithBackend,
  updateCenterProfileWithBackend,
} from "@/modules/center/server/center-auth.dal";
import type { CenterProfileUpdatePayload } from "@/modules/center/types/center-auth.types";

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

export async function GET(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const profile = await getCenterProfileWithBackend(accessToken);
    return NextResponse.json(profile, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CenterBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load center profile" },
      { status: 500 },
    );
  }
}

function parseProfileUpdatePayload(payload: unknown): CenterProfileUpdatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const result: CenterProfileUpdatePayload = {};
  const fields: Array<keyof CenterProfileUpdatePayload> = [
    "firstName",
    "lastName",
    "centerName",
    "email",
    "phone",
  ];

  for (const field of fields) {
    const value = body[field];
    if (typeof value === "string" && value.trim().length > 0) {
      result[field] = value.trim();
    }
  }

  return Object.keys(result).length > 0 ? result : null;
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
    const profileUpdate = parseProfileUpdatePayload(payload);
    if (!profileUpdate) {
      return NextResponse.json(
        { message: "Invalid center profile update payload" },
        { status: 400 },
      );
    }

    const profile = await updateCenterProfileWithBackend(accessToken, profileUpdate);
    return NextResponse.json(profile, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CenterBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to update center profile" },
      { status: 500 },
    );
  }
}
