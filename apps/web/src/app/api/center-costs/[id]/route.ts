import { NextRequest, NextResponse } from "next/server";
import {
  CenterCostBackendError,
  updateCenterCostWithBackend,
} from "@/modules/center-cost/server/center-cost.dal";
import type { CenterCostUpdatePayload } from "@/modules/center-cost/types/center-cost.types";

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

function parseNullableTeacherId(value: unknown) {
  if (value === undefined) {
    return {
      isValid: true,
      value: undefined as string | null | undefined,
    };
  }

  if (value === null) {
    return {
      isValid: true,
      value: null,
    };
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return {
      isValid: true,
      value: normalized.length > 0 ? normalized : null,
    };
  }

  return {
    isValid: false,
    value: undefined as string | null | undefined,
  };
}

function parseUpdatePayload(payload: unknown): CenterCostUpdatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const result: CenterCostUpdatePayload = {};

  if ("teacher_id" in body) {
    const teacherIdResult = parseNullableTeacherId(body.teacher_id);
    if (!teacherIdResult.isValid) {
      return null;
    }

    if (teacherIdResult.value !== undefined) {
      result.teacher_id = teacherIdResult.value;
    }
  }

  if ("name" in body) {
    const name = parseOptionalTextField(body.name);
    if (!name) {
      return null;
    }

    result.name = name;
  }

  if ("deduction_type" in body) {
    const deductionType =
      typeof body.deduction_type === "string"
        ? body.deduction_type.trim().toUpperCase()
        : "";

    if (
      deductionType !== "PERCENTAGE_OF_TOTAL" &&
      deductionType !== "PERCENTAGE_PER_STUDENT" &&
      deductionType !== "FIXED_PER_STUDENT"
    ) {
      return null;
    }

    result.deduction_type = deductionType;
  }

  if ("value" in body) {
    const valueResult = parseOptionalNumberField(body.value);
    if (!valueResult.isValid || valueResult.value === undefined) {
      return null;
    }

    result.value = valueResult.value;
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
    const centerCostId = id.trim();
    if (!centerCostId) {
      return NextResponse.json(
        { message: "Invalid center cost id" },
        { status: 400 },
      );
    }

    const payload = await request.json();
    const updatePayload = parseUpdatePayload(payload);
    if (!updatePayload) {
      return NextResponse.json(
        { message: "Invalid center cost update payload" },
        { status: 400 },
      );
    }

    const centerCost = await updateCenterCostWithBackend(
      accessToken,
      centerCostId,
      updatePayload,
    );
    return NextResponse.json(centerCost, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CenterCostBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to update center cost" },
      { status: 500 },
    );
  }
}
