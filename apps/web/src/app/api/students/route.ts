import { NextRequest, NextResponse } from "next/server";
import {
  getStudentsWithBackend,
  StudentBackendError,
} from "@/modules/student/server/student.dal";
import type {
  SchoolCycle,
  SchoolYear,
  StudentListQuery,
} from "@/modules/student/types/student.types";

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

const schoolYears: SchoolYear[] = [
  "FIRST_YEAR",
  "SECOND_YEAR",
  "THIRD_YEAR",
  "FOURTH_YEAR",
  "FIFTH_YEAR",
  "SIXTH_YEAR",
];

const schoolCycles: SchoolCycle[] = ["PRIMARY", "COLLEGE", "LYCEE"];

function parseSchoolCycle(value: string | null): SchoolCycle | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return schoolCycles.find((schoolCycle) => schoolCycle === normalized);
}

function parseSchoolYear(value: string | null): SchoolYear | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return schoolYears.find((schoolYear) => schoolYear === normalized);
}

function parseQuery(request: NextRequest): StudentListQuery {
  const searchValue = request.nextUrl.searchParams.get("search");
  const normalizedSearch =
    typeof searchValue === "string" && searchValue.trim().length > 0
      ? searchValue.trim()
      : undefined;

  return {
    search: normalizedSearch,
    schoolCycle: parseSchoolCycle(request.nextUrl.searchParams.get("schoolCycle")),
    schoolYear: parseSchoolYear(request.nextUrl.searchParams.get("schoolYear")),
    isActive: parseIsActive(request.nextUrl.searchParams.get("isActive")),
    page: parseInteger(request.nextUrl.searchParams.get("page")),
    limit: parseInteger(request.nextUrl.searchParams.get("limit")),
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

    const students = await getStudentsWithBackend(accessToken, parseQuery(request));
    return NextResponse.json(students, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof StudentBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load students" },
      { status: 500 },
    );
  }
}
