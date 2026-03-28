import { NextRequest, NextResponse } from "next/server";
import {
  createTeacherWithBackend,
  getTeachersWithBackend,
  TeacherBackendError,
} from "@/modules/teacher/server/teacher.dal";
import type {
  TeacherCreatePayload,
  TeacherListQuery,
} from "@/modules/teacher/types/teacher.types";

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

function parseQuery(request: NextRequest): TeacherListQuery {
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

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function parseCreatePayload(payload: unknown): TeacherCreatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const cin = typeof body.cin === "string" ? body.cin.trim() : "";

  if (!firstName || !lastName || !email || !password || !phone || !cin) {
    return null;
  }

  const result: TeacherCreatePayload = {
    firstName,
    lastName,
    email,
    password,
    phone,
    cin,
  };

  const hourlyRate = parseOptionalNumber(body.hourlyRate);
  if (hourlyRate !== undefined) {
    result.hourlyRate = hourlyRate;
  }

  const maxHoursPerWeek = parseOptionalNumber(body.maxHoursPerWeek);
  if (maxHoursPerWeek !== undefined) {
    result.maxHoursPerWeek = maxHoursPerWeek;
  }

  return result;
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

    const teachers = await getTeachersWithBackend(accessToken, parseQuery(request));
    return NextResponse.json(teachers, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof TeacherBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load teachers" },
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
        { message: "Invalid teacher payload" },
        { status: 400 },
      );
    }

    const teacher = await createTeacherWithBackend(accessToken, createPayload);
    return NextResponse.json(teacher, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof TeacherBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to create teacher" },
      { status: 500 },
    );
  }
}
