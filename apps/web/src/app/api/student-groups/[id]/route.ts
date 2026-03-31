import { NextRequest, NextResponse } from "next/server";
import {
  deleteStudentGroupWithBackend,
  getStudentGroupByIdWithBackend,
  StudentGroupBackendError,
  updateStudentGroupWithBackend,
} from "@/modules/student-group/server/student-group.dal";
import {
  isSchoolYearAllowedForCycle,
  parseSchoolCycle,
  parseSchoolYear,
} from "@/modules/student-group/constants/student-group-level";
import type { StudentGroupUpdatePayload } from "@/modules/student-group/types/student-group.types";

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

function parseOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseUpdatePayload(payload: unknown): StudentGroupUpdatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const teacherSubjectId = parseOptionalString(body.teacherSubjectId);
  const name = parseOptionalString(body.name);
  const schoolCycle = parseSchoolCycle(
    typeof body.schoolCycle === "string" ? body.schoolCycle : null,
  );
  const schoolYear = parseSchoolYear(
    typeof body.schoolYear === "string" ? body.schoolYear : null,
  );

  if (
    schoolCycle &&
    schoolYear &&
    !isSchoolYearAllowedForCycle(schoolCycle, schoolYear)
  ) {
    return null;
  }

  const parsedPayload: StudentGroupUpdatePayload = {
    ...(teacherSubjectId ? { teacherSubjectId } : {}),
    ...(name ? { name } : {}),
    ...(schoolCycle ? { schoolCycle } : {}),
    ...(schoolYear ? { schoolYear } : {}),
  };

  if (Object.keys(parsedPayload).length === 0) {
    return null;
  }

  return parsedPayload;
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
    const groupId = id.trim();
    if (!groupId) {
      return NextResponse.json(
        { message: "Invalid student group id" },
        { status: 400 },
      );
    }

    const studentGroup = await getStudentGroupByIdWithBackend(accessToken, groupId);
    return NextResponse.json(studentGroup, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof StudentGroupBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load student group details" },
      { status: 500 },
    );
  }
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
    const groupId = id.trim();
    if (!groupId) {
      return NextResponse.json(
        { message: "Invalid student group id" },
        { status: 400 },
      );
    }

    const payload = await request.json();
    const updatePayload = parseUpdatePayload(payload);
    if (!updatePayload) {
      return NextResponse.json(
        { message: "Invalid student group update payload" },
        { status: 400 },
      );
    }

    const studentGroup = await updateStudentGroupWithBackend(
      accessToken,
      groupId,
      updatePayload,
    );
    return NextResponse.json(studentGroup, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof StudentGroupBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to update student group" },
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
    const groupId = id.trim();
    if (!groupId) {
      return NextResponse.json(
        { message: "Invalid student group id" },
        { status: 400 },
      );
    }

    await deleteStudentGroupWithBackend(accessToken, groupId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof StudentGroupBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to delete student group" },
      { status: 500 },
    );
  }
}
