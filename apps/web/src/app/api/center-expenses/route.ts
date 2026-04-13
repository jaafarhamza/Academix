import { NextRequest, NextResponse } from "next/server";
import {
  CenterExpenseBackendError,
  getCenterExpensesWithBackend,
} from "@/modules/center-expense/server/center-expense.dal";
import type { CenterExpenseListQuery } from "@/modules/center-expense/types/center-expense.types";

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

function parseMonth(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(normalized) ? normalized : undefined;
}

function parseQuery(request: NextRequest): CenterExpenseListQuery {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("user_id");

  return {
    user_id:
      typeof userId === "string" && userId.trim().length > 0
        ? userId.trim()
        : undefined,
    month: parseMonth(searchParams.get("month")),
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

    const centerExpenses = await getCenterExpensesWithBackend(
      accessToken,
      parseQuery(request),
    );
    return NextResponse.json(centerExpenses, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CenterExpenseBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load center expenses" },
      { status: 500 },
    );
  }
}
