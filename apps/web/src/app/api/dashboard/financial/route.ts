import { NextRequest, NextResponse } from "next/server";
import {
  DashboardBackendError,
  getFinancialDashboardWithBackend,
} from "@/modules/dashboard/server/dashboard.dal";
import type {
  FinancialDashboardPeriod,
  FinancialDashboardQuery,
} from "@/modules/dashboard/types/dashboard.types";

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

function parsePeriod(value: string | null): FinancialDashboardPeriod | undefined {
  if (value === "THIS_MONTH" || value === "LAST_MONTH" || value === "CUSTOM") {
    return value;
  }

  return undefined;
}

function parseQuery(request: NextRequest): FinancialDashboardQuery {
  const searchParams = request.nextUrl.searchParams;

  return {
    period: parsePeriod(searchParams.get("period")),
    from: searchParams.get("from")?.trim() || undefined,
    to: searchParams.get("to")?.trim() || undefined,
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

    const dashboard = await getFinancialDashboardWithBackend(
      accessToken,
      parseQuery(request),
    );
    return NextResponse.json(dashboard, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof DashboardBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load financial dashboard" },
      { status: 500 },
    );
  }
}
