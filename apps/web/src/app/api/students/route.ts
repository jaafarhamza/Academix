import { NextRequest, NextResponse } from "next/server";
import {
  createStudentWithBackend,
  getStudentsWithBackend,
  StudentBackendError,
} from "@/modules/student/server/student.dal";
import type {
  SchoolCycle,
  SchoolYear,
  StudentCreatePayload,
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

const allowedYearsByCycle: Record<SchoolCycle, SchoolYear[]> = {
  PRIMARY: schoolYears,
  COLLEGE: ["FIRST_YEAR", "SECOND_YEAR", "THIRD_YEAR"],
  LYCEE: ["FIRST_YEAR", "SECOND_YEAR", "THIRD_YEAR"],
};

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
  const groupId = request.nextUrl.searchParams.get("groupId")?.trim();
  const normalizedSearch =
    typeof searchValue === "string" && searchValue.trim().length > 0
      ? searchValue.trim()
      : undefined;

  return {
    search: normalizedSearch,
    groupId: groupId ? groupId : undefined,
    schoolCycle: parseSchoolCycle(request.nextUrl.searchParams.get("schoolCycle")),
    schoolYear: parseSchoolYear(request.nextUrl.searchParams.get("schoolYear")),
    isActive: parseIsActive(request.nextUrl.searchParams.get("isActive")),
    page: parseInteger(request.nextUrl.searchParams.get("page")),
    limit: parseInteger(request.nextUrl.searchParams.get("limit")),
  };
}

function parseCreatePayload(payload: unknown): StudentCreatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const parentPhone =
    typeof body.parentPhone === "string" ? body.parentPhone.trim() : "";
  const schoolName =
    typeof body.schoolName === "string" ? body.schoolName.trim() : "";
  const schoolCycle = parseSchoolCycle(
    typeof body.schoolCycle === "string" ? body.schoolCycle : null,
  );
  const schoolYear = parseSchoolYear(
    typeof body.schoolYear === "string" ? body.schoolYear : null,
  );

  if (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !phone ||
    !parentPhone ||
    !schoolName ||
    !schoolCycle ||
    !schoolYear
  ) {
    return null;
  }

  if (!allowedYearsByCycle[schoolCycle].includes(schoolYear)) {
    return null;
  }

  return {
    firstName,
    lastName,
    email,
    password,
    phone,
    parentPhone,
    schoolName,
    schoolCycle,
    schoolYear,
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
        { message: "Invalid student payload" },
        { status: 400 },
      );
    }

    const student = await createStudentWithBackend(accessToken, createPayload);
    return NextResponse.json(student, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof StudentBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to create student" },
      { status: 500 },
    );
  }
}
