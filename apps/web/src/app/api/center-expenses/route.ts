import { NextRequest, NextResponse } from "next/server";
import {
  CenterExpenseBackendError,
  createCenterExpenseWithBackend,
  getCenterExpensesWithBackend,
} from "@/modules/center-expense/server/center-expense.dal";
import type {
  CenterExpenseCreatePayload,
  CenterExpenseListQuery,
} from "@/modules/center-expense/types/center-expense.types";

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

function parseCreatePayload(payload: unknown): CenterExpenseCreatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const user_id =
    typeof body.user_id === "string" ? body.user_id.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const amount =
    typeof body.amount === "number"
      ? body.amount
      : typeof body.amount === "string"
        ? Number(body.amount)
        : Number.NaN;

  if (
    !user_id ||
    !description ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(amount)
  ) {
    return null;
  }

  return {
    user_id,
    amount,
    description,
    date,
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
        { message: "Invalid center expense payload" },
        { status: 400 },
      );
    }

    const centerExpense = await createCenterExpenseWithBackend(
      accessToken,
      createPayload,
    );
    return NextResponse.json(centerExpense, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof CenterExpenseBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to create center expense" },
      { status: 500 },
    );
  }
}
