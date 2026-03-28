import { NextRequest, NextResponse } from "next/server";
import {
  createSecretaryWithBackend,
  getSecretariesWithBackend,
  SecretaryBackendError,
} from "@/modules/secretary/server/secretary.dal";
import type {
  SecretaryCreatePayload,
  SecretaryListQuery,
} from "@/modules/secretary/types/secretary.types";

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

function parseInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseIsActive(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  return undefined;
}

function parseQuery(request: NextRequest): SecretaryListQuery {
  const searchValue = request.nextUrl.searchParams.get("search");
  const normalizedSearch =
    typeof searchValue === "string" && searchValue.trim().length > 0
      ? searchValue.trim()
      : undefined;

  return {
    search: normalizedSearch,
    isActive: parseIsActive(request.nextUrl.searchParams.get("isActive")),
    page: parseInteger(request.nextUrl.searchParams.get("page")),
    limit: parseInteger(request.nextUrl.searchParams.get("limit")),
  };
}

function parseCreatePayload(payload: unknown): SecretaryCreatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const cin = typeof body.cin === "string" ? body.cin.trim() : "";

  if (!firstName || !lastName || !email || !password || !phone || !cin) {
    return null;
  }

  return {
    firstName,
    lastName,
    email,
    password,
    phone,
    cin,
  };
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

    const secretaries = await getSecretariesWithBackend(accessToken, parseQuery(request));
    return NextResponse.json(secretaries, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof SecretaryBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load secretaries" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const payload = await request.json();
    const createPayload = parseCreatePayload(payload);

    if (!createPayload) {
      return NextResponse.json(
        { message: "Invalid secretary payload" },
        { status: 400 },
      );
    }

    const secretary = await createSecretaryWithBackend(accessToken, createPayload);
    return NextResponse.json(secretary, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof SecretaryBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to create secretary" },
      { status: 500 },
    );
  }
}
