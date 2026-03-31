import { NextRequest, NextResponse } from "next/server";
import {
  createEnrollmentWithBackend,
  EnrollmentBackendError,
  getEnrollmentsWithBackend,
} from "@/modules/enrollment/server/enrollment.dal";
import type {
  EnrollmentCreatePayload,
  EnrollmentListQuery,
} from "@/modules/enrollment/types/enrollment.types";

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

function parseQuery(request: NextRequest): EnrollmentListQuery {
  const studentId = request.nextUrl.searchParams.get("studentId")?.trim();
  const studentGroupId = request.nextUrl.searchParams
    .get("studentGroupId")
    ?.trim();

  return {
    studentId: studentId ? studentId : undefined,
    studentGroupId: studentGroupId ? studentGroupId : undefined,
    isActive: parseIsActive(request.nextUrl.searchParams.get("isActive")),
    page: parseInteger(request.nextUrl.searchParams.get("page")),
    limit: parseInteger(request.nextUrl.searchParams.get("limit")),
  };
}

function parseCreatePayload(payload: unknown): EnrollmentCreatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const studentId =
    typeof body.studentId === "string" ? body.studentId.trim() : "";
  const studentGroupId =
    typeof body.studentGroupId === "string" ? body.studentGroupId.trim() : "";
  const enrollmentDate =
    typeof body.enrollmentDate === "string" && body.enrollmentDate.trim().length > 0
      ? body.enrollmentDate.trim()
      : undefined;

  if (!studentId || !studentGroupId) {
    return null;
  }

  return {
    studentId,
    studentGroupId,
    ...(enrollmentDate ? { enrollmentDate } : {}),
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

    const enrollments = await getEnrollmentsWithBackend(accessToken, parseQuery(request));
    return NextResponse.json(enrollments, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof EnrollmentBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load enrollments" },
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
        { message: "Invalid enrollment payload" },
        { status: 400 },
      );
    }

    const enrollment = await createEnrollmentWithBackend(accessToken, createPayload);
    return NextResponse.json(enrollment, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof EnrollmentBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to create enrollment" },
      { status: 500 },
    );
  }
}
