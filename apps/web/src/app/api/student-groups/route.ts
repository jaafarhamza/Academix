import { NextRequest, NextResponse } from "next/server";
import {
  createStudentGroupWithBackend,
  getStudentGroupsWithBackend,
  StudentGroupBackendError,
} from "@/modules/student-group/server/student-group.dal";
import {
  isSchoolYearAllowedForCycle,
  parseSchoolCycle,
  parseSchoolYear,
} from "@/modules/student-group/constants/student-group-level";
import type {
  StudentGroupCreatePayload,
  StudentGroupListQuery,
} from "@/modules/student-group/types/student-group.types";

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
    !isSchoolYearAllowedForCycle(schoolCycle, schoolYear)
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

function parseCreatePayload(payload: unknown): StudentGroupCreatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const teacherSubjectId =
    typeof body.teacherSubjectId === "string"
      ? body.teacherSubjectId.trim()
      : "";
  const schoolCycle = parseSchoolCycle(
    typeof body.schoolCycle === "string" ? body.schoolCycle : null,
  );
  const schoolYear = parseSchoolYear(
    typeof body.schoolYear === "string" ? body.schoolYear : null,
  );
  const name =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim()
      : undefined;

  if (!teacherSubjectId || !schoolCycle || !schoolYear) {
    return null;
  }

  if (!isSchoolYearAllowedForCycle(schoolCycle, schoolYear)) {
    return null;
  }

  return {
    teacherSubjectId,
    schoolCycle,
    schoolYear,
    ...(name ? { name } : {}),
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
        { message: "Invalid student group payload" },
        { status: 400 },
      );
    }

    const studentGroup = await createStudentGroupWithBackend(
      accessToken,
      createPayload,
    );

    return NextResponse.json(studentGroup, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof StudentGroupBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to create student group" },
      { status: 500 },
    );
  }
}
