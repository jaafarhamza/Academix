import { NextRequest, NextResponse } from "next/server";
import {
  getSecretaryByIdWithBackend,
  SecretaryBackendError,
  updateSecretaryWithBackend,
} from "@/modules/secretary/server/secretary.dal";
import type { SecretaryUpdatePayload } from "@/modules/secretary/types/secretary.types";

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

function parseOptionalTextField(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseUpdatePayload(payload: unknown): SecretaryUpdatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const result: SecretaryUpdatePayload = {};

  if ("firstName" in body) {
    const firstName = parseOptionalTextField(body.firstName);
    if (!firstName) {
      return null;
    }
    result.firstName = firstName;
  }

  if ("lastName" in body) {
    const lastName = parseOptionalTextField(body.lastName);
    if (!lastName) {
      return null;
    }
    result.lastName = lastName;
  }

  if ("email" in body) {
    const email = parseOptionalTextField(body.email);
    if (!email) {
      return null;
    }
    result.email = email;
  }

  if ("phone" in body) {
    const phone = parseOptionalTextField(body.phone);
    if (!phone) {
      return null;
    }
    result.phone = phone;
  }

  if ("cin" in body) {
    const cin = parseOptionalTextField(body.cin);
    if (!cin) {
      return null;
    }
    result.cin = cin;
  }

  return Object.keys(result).length > 0 ? result : null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const secretaryId = id.trim();
    if (!secretaryId) {
      return NextResponse.json(
        { message: "Invalid secretary id" },
        { status: 400 },
      );
    }

    const payload = await request.json();
    const updatePayload = parseUpdatePayload(payload);
    if (!updatePayload) {
      return NextResponse.json(
        { message: "Invalid secretary update payload" },
        { status: 400 },
      );
    }

    const secretary = await updateSecretaryWithBackend(
      accessToken,
      secretaryId,
      updatePayload,
    );
    return NextResponse.json(secretary, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof SecretaryBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to update secretary" },
      { status: 500 },
    );
  }
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
    const secretaryId = id.trim();
    if (!secretaryId) {
      return NextResponse.json(
        { message: "Invalid secretary id" },
        { status: 400 },
      );
    }

    const secretary = await getSecretaryByIdWithBackend(accessToken, secretaryId);
    return NextResponse.json(secretary, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof SecretaryBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load secretary details" },
      { status: 500 },
    );
  }
}
