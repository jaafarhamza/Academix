import { NextRequest, NextResponse } from "next/server";
import {
  CenterExpenseBackendError,
  deleteCenterExpenseWithBackend,
  updateCenterExpenseWithBackend,
} from "@/modules/center-expense/server/center-expense.dal";
import type { CenterExpenseUpdatePayload } from "@/modules/center-expense/types/center-expense.types";

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

function parseOptionalNumberField(value: unknown) {
  if (value === undefined) {
    return {
      isValid: true,
      value: undefined as number | undefined,
    };
  }

  if (typeof value === "number") {
    return {
      isValid: Number.isFinite(value),
      value,
    };
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return {
        isValid: true,
        value: undefined as number | undefined,
      };
    }

    const parsed = Number(normalized);
    return {
      isValid: Number.isFinite(parsed),
      value: parsed,
    };
  }

  return {
    isValid: false,
    value: undefined as number | undefined,
  };
}

function parseUpdatePayload(payload: unknown): CenterExpenseUpdatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const result: CenterExpenseUpdatePayload = {};

  if ("user_id" in body) {
    const userId = parseOptionalTextField(body.user_id);
    if (!userId) {
      return null;
    }

    result.user_id = userId;
  }

  if ("amount" in body) {
    const amountResult = parseOptionalNumberField(body.amount);
    if (!amountResult.isValid || amountResult.value === undefined) {
      return null;
    }

    result.amount = amountResult.value;
  }

  if ("description" in body) {
    const description = parseOptionalTextField(body.description);
    if (!description) {
      return null;
    }

    result.description = description;
  }

  if ("date" in body) {
    const date = parseOptionalTextField(body.date);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return null;
    }

    result.date = date;
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
    const centerExpenseId = id.trim();
    if (!centerExpenseId) {
      return NextResponse.json(
        { message: "Invalid center expense id" },
        { status: 400 },
      );
    }

    const payload = await request.json();
    const updatePayload = parseUpdatePayload(payload);
    if (!updatePayload) {
      return NextResponse.json(
        { message: "Invalid center expense update payload" },
        { status: 400 },
      );
    }

    const centerExpense = await updateCenterExpenseWithBackend(
      accessToken,
      centerExpenseId,
      updatePayload,
    );
    return NextResponse.json(centerExpense, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CenterExpenseBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to update center expense" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const centerExpenseId = id.trim();
    if (!centerExpenseId) {
      return NextResponse.json(
        { message: "Invalid center expense id" },
        { status: 400 },
      );
    }

    await deleteCenterExpenseWithBackend(accessToken, centerExpenseId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof CenterExpenseBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to delete center expense" },
      { status: 500 },
    );
  }
}
