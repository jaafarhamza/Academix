import { NextRequest, NextResponse } from "next/server";
import {
  StudentBackendError,
  updateStudentWithBackend,
} from "@/modules/student/server/student.dal";
import type {
  SchoolCycle,
  SchoolYear,
  StudentUpdatePayload,
} from "@/modules/student/types/student.types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

function parseSchoolCycle(value: unknown): SchoolCycle | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return schoolCycles.find((schoolCycle) => schoolCycle === normalized);
}

function parseSchoolYear(value: unknown): SchoolYear | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return schoolYears.find((schoolYear) => schoolYear === normalized);
}

function parseUpdatePayload(payload: unknown): StudentUpdatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const result: StudentUpdatePayload = {};

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

  if ("parentPhone" in body) {
    const parentPhone = parseOptionalTextField(body.parentPhone);
    if (!parentPhone) {
      return null;
    }
    result.parentPhone = parentPhone;
  }

  if ("schoolName" in body) {
    const schoolName = parseOptionalTextField(body.schoolName);
    if (!schoolName) {
      return null;
    }
    result.schoolName = schoolName;
  }

  const hasSchoolCycle = "schoolCycle" in body;
  const hasSchoolYear = "schoolYear" in body;

  if (hasSchoolCycle) {
    const schoolCycle = parseSchoolCycle(body.schoolCycle);
    if (!schoolCycle) {
      return null;
    }
    result.schoolCycle = schoolCycle;
  }

  if (hasSchoolYear) {
    const schoolYear = parseSchoolYear(body.schoolYear);
    if (!schoolYear) {
      return null;
    }
    result.schoolYear = schoolYear;
  }

  if (hasSchoolCycle && hasSchoolYear) {
    const schoolCycle = result.schoolCycle;
    const schoolYear = result.schoolYear;

    if (!schoolCycle || !schoolYear) {
      return null;
    }

    if (!allowedYearsByCycle[schoolCycle].includes(schoolYear)) {
      return null;
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
    const studentId = id.trim();
    if (!studentId) {
      return NextResponse.json(
        { message: "Invalid student id" },
        { status: 400 },
      );
    }

    const payload = await request.json();
    const updatePayload = parseUpdatePayload(payload);
    if (!updatePayload) {
      return NextResponse.json(
        { message: "Invalid student update payload" },
        { status: 400 },
      );
    }

    const student = await updateStudentWithBackend(accessToken, studentId, updatePayload);
    return NextResponse.json(student, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof StudentBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to update student" },
      { status: 500 },
    );
  }
}
