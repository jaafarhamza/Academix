import { NextRequest, NextResponse } from "next/server";
import {
  createTeacherSubjectWithBackend,
  getTeacherSubjectsWithBackend,
  TeacherSubjectBackendError,
} from "@/modules/teacher-subject/server/teacher-subject.dal";
import type {
  TeacherSubjectCreatePayload,
  TeacherSubjectListQuery,
} from "@/modules/teacher-subject/types/teacher-subject.types";

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

function parseQuery(request: NextRequest): TeacherSubjectListQuery {
  const teacherId = request.nextUrl.searchParams.get("teacherId")?.trim();
  const subjectId = request.nextUrl.searchParams.get("subjectId")?.trim();

  return {
    teacherId: teacherId ? teacherId : undefined,
    subjectId: subjectId ? subjectId : undefined,
    page: parseInteger(request.nextUrl.searchParams.get("page")),
    limit: parseInteger(request.nextUrl.searchParams.get("limit")),
  };
}

function parseCreatePayload(payload: unknown): TeacherSubjectCreatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const teacherId =
    typeof body.teacherId === "string" ? body.teacherId.trim() : "";
  const subjectId =
    typeof body.subjectId === "string" ? body.subjectId.trim() : "";

  if (!teacherId || !subjectId) {
    return null;
  }

  return {
    teacherId,
    subjectId,
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

    const assignments = await getTeacherSubjectsWithBackend(
      accessToken,
      parseQuery(request),
    );

    return NextResponse.json(assignments, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof TeacherSubjectBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load teacher-subject assignments" },
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
        { message: "Invalid teacher-subject payload" },
        { status: 400 },
      );
    }

    const assignment = await createTeacherSubjectWithBackend(
      accessToken,
      createPayload,
    );

    return NextResponse.json(assignment, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof TeacherSubjectBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to create teacher-subject assignment" },
      { status: 500 },
    );
  }
}
