import { NextRequest, NextResponse } from "next/server";
import {
  CenterCostBackendError,
  getCenterCostsWithBackend,
} from "@/modules/center-cost/server/center-cost.dal";
import type {
  CenterCostListQuery,
  CenterCostScopeFilter,
} from "@/modules/center-cost/types/center-cost.types";

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

function parseScope(value: string | null): CenterCostScopeFilter | undefined {
  const normalized = value?.trim().toUpperCase();
  if (
    normalized === "ALL" ||
    normalized === "GLOBAL" ||
    normalized === "PER_TEACHER"
  ) {
    return normalized;
  }

  return undefined;
}

function parseQuery(request: NextRequest): CenterCostListQuery {
  const searchParams = request.nextUrl.searchParams;

  return {
    scope: parseScope(searchParams.get("scope")),
    page: parseInteger(searchParams.get("page")),
    limit: parseInteger(searchParams.get("limit")),
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

    const centerCosts = await getCenterCostsWithBackend(accessToken, parseQuery(request));
    return NextResponse.json(centerCosts, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CenterCostBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load center costs" },
      { status: 500 },
    );
  }
}
