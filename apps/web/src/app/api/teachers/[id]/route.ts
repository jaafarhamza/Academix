import { NextRequest, NextResponse } from "next/server";
import {
  deactivateTeacherWithBackend,
  getTeacherByIdWithBackend,
  TeacherBackendError,
  updateTeacherWithBackend,
} from "@/modules/teacher/server/teacher.dal";
import type { TeacherUpdatePayload } from "@/modules/teacher/types/teacher.types";

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

function parseNullableNumberField(value: unknown): {
  isValid: boolean;
  value: number | null | undefined;
} {
  if (value === undefined) {
    return {
      isValid: true,
      value: undefined,
    };
  }

  if (value === null) {
    return {
      isValid: true,
      value: null,
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
        value: undefined,
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
    value: undefined,
  };
}

function parseUpdatePayload(payload: unknown): TeacherUpdatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const result: TeacherUpdatePayload = {};

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

  if ("hourlyRate" in body) {
    const hourlyRateResult = parseNullableNumberField(body.hourlyRate);
    if (!hourlyRateResult.isValid) {
      return null;
    }

    if (hourlyRateResult.value !== undefined) {
      result.hourlyRate = hourlyRateResult.value;
    }
  }

  if ("maxHoursPerWeek" in body) {
    const maxHoursResult = parseNullableNumberField(body.maxHoursPerWeek);
    if (!maxHoursResult.isValid) {
      return null;
    }

    if (maxHoursResult.value !== undefined) {
      result.maxHoursPerWeek = maxHoursResult.value;
    }
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
    const teacherId = id.trim();
    if (!teacherId) {
      return NextResponse.json(
        { message: "Invalid teacher id" },
        { status: 400 },
      );
    }

    const payload = await request.json();
    const updatePayload = parseUpdatePayload(payload);
    if (!updatePayload) {
      return NextResponse.json(
        { message: "Invalid teacher update payload" },
        { status: 400 },
      );
    }

    const teacher = await updateTeacherWithBackend(accessToken, teacherId, updatePayload);
    return NextResponse.json(teacher, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof TeacherBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to update teacher" },
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
    const teacherId = id.trim();
    if (!teacherId) {
      return NextResponse.json(
        { message: "Invalid teacher id" },
        { status: 400 },
      );
    }

    const teacher = await getTeacherByIdWithBackend(accessToken, teacherId);
    return NextResponse.json(teacher, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof TeacherBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load teacher details" },
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
    const teacherId = id.trim();
    if (!teacherId) {
      return NextResponse.json(
        { message: "Invalid teacher id" },
        { status: 400 },
      );
    }

    await deactivateTeacherWithBackend(accessToken, teacherId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof TeacherBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to deactivate teacher" },
      { status: 500 },
    );
  }
}
