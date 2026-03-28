import { NextRequest, NextResponse } from "next/server";
import {
  getSecretariesWithBackend,
  SecretaryBackendError,
} from "@/modules/secretary/server/secretary.dal";
import type { SecretaryListQuery } from "@/modules/secretary/types/secretary.types";

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
