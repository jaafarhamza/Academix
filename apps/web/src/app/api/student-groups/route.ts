import { NextRequest, NextResponse } from "next/server";
import {
  getStudentGroupsWithBackend,
  StudentGroupBackendError,
} from "@/modules/student-group/server/student-group.dal";
import type { StudentGroupListQuery } from "@/modules/student-group/types/student-group.types";
import type { SchoolCycle, SchoolYear } from "@/modules/student/types/student.types";

const schoolCycles: SchoolCycle[] = ["PRIMARY", "COLLEGE", "LYCEE"];
const schoolYears: SchoolYear[] = [
  "FIRST_YEAR",
  "SECOND_YEAR",
  "THIRD_YEAR",
  "FOURTH_YEAR",
  "FIFTH_YEAR",
  "SIXTH_YEAR",
];
const allowedSchoolYearsByCycle: Record<SchoolCycle, SchoolYear[]> = {
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

function parseInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

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

function parseQuery(request: NextRequest): StudentGroupListQuery {
  const schoolCycle = parseSchoolCycle(
    request.nextUrl.searchParams.get("schoolCycle"),
  );
  let schoolYear = parseSchoolYear(
    request.nextUrl.searchParams.get("schoolYear"),
  );
  const teacherId = request.nextUrl.searchParams.get("teacherId")?.trim();
  const subjectId = request.nextUrl.searchParams.get("subjectId")?.trim();

  if (
    schoolCycle &&
    schoolYear &&
    !allowedSchoolYearsByCycle[schoolCycle].includes(schoolYear)
  ) {
    schoolYear = undefined;
  }

  return {
    schoolCycle,
    schoolYear,
    teacherId: teacherId ? teacherId : undefined,
    subjectId: subjectId ? subjectId : undefined,
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

    const studentGroups = await getStudentGroupsWithBackend(
      accessToken,
      parseQuery(request),
    );

    return NextResponse.json(studentGroups, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof StudentGroupBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load student groups" },
      { status: 500 },
    );
  }
}
