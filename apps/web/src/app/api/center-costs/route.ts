import { NextRequest, NextResponse } from "next/server";
import {
  CenterCostBackendError,
  createCenterCostWithBackend,
  getCenterCostsWithBackend,
} from "@/modules/center-cost/server/center-cost.dal";
import type {
  CenterCostCreatePayload,
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

function parseCreatePayload(payload: unknown): CenterCostCreatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const teacher_id =
    typeof body.teacher_id === "string" ? body.teacher_id.trim() : undefined;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const deduction_type =
    typeof body.deduction_type === "string"
      ? body.deduction_type.trim().toUpperCase()
      : "";
  const value =
    typeof body.value === "number"
      ? body.value
      : typeof body.value === "string"
        ? Number(body.value)
        : Number.NaN;

  if (
    !name ||
    !(
      deduction_type === "PERCENTAGE_OF_TOTAL" ||
      deduction_type === "PERCENTAGE_PER_STUDENT" ||
      deduction_type === "FIXED_PER_STUDENT"
    ) ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return {
    teacher_id: teacher_id || undefined,
    name,
    deduction_type,
    value,
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
        { message: "Invalid center cost payload" },
        { status: 400 },
      );
    }

    const centerCost = await createCenterCostWithBackend(accessToken, createPayload);
    return NextResponse.json(centerCost, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof CenterCostBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to create center cost" },
      { status: 500 },
    );
  }
}
