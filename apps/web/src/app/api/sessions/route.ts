import { NextRequest, NextResponse } from "next/server";
import {
  createCourseSessionWithBackend,
  CourseSessionBackendError,
  getCourseSessionsWithBackend,
} from "@/modules/course-session/server/course-session.dal";
import {
  courseSessionDayValues,
  type CourseSessionCreatePayload,
  courseSessionStatusValues,
  type CourseSessionDay,
  type CourseSessionListQuery,
  type CourseSessionStatus,
} from "@/modules/course-session/types/course-session.types";

const dayValues = new Set<CourseSessionDay>(courseSessionDayValues);
const statusValues = new Set<CourseSessionStatus>(courseSessionStatusValues);

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

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseUuidLike(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseDay(value: string | null): CourseSessionDay | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return dayValues.has(normalized as CourseSessionDay)
    ? (normalized as CourseSessionDay)
    : undefined;
}

function parseStatus(value: string | null): CourseSessionStatus | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return statusValues.has(normalized as CourseSessionStatus)
    ? (normalized as CourseSessionStatus)
    : undefined;
}

function parseIsoDateString(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  const parsedTimestamp = Date.parse(normalized);
  return Number.isNaN(parsedTimestamp) ? undefined : normalized;
}

function parseTimeString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : undefined;
}

function parseCreatePayload(payload: unknown): CourseSessionCreatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const teacherId = parseUuidLike(
    typeof body.teacherId === "string" ? body.teacherId : null,
  );
  const subjectId = parseUuidLike(
    typeof body.subjectId === "string" ? body.subjectId : null,
  );
  const roomId = parseUuidLike(typeof body.roomId === "string" ? body.roomId : null);
  const day = parseDay(typeof body.day === "string" ? body.day : null);
  const startTime = parseTimeString(body.startTime);
  const endTime = parseTimeString(body.endTime);
  const studentId = parseUuidLike(
    typeof body.studentId === "string" ? body.studentId : null,
  );
  const studentGroupId = parseUuidLike(
    typeof body.studentGroupId === "string" ? body.studentGroupId : null,
  );

  if (!teacherId || !subjectId || !roomId || !day || !startTime || !endTime) {
    return null;
  }

  const hasStudentId = typeof studentId === "string";
  const hasStudentGroupId = typeof studentGroupId === "string";

  if (hasStudentId === hasStudentGroupId) {
    return null;
  }

  return {
    teacherId,
    subjectId,
    roomId,
    day,
    startTime,
    endTime,
    ...(studentId ? { studentId } : {}),
    ...(studentGroupId ? { studentGroupId } : {}),
  };
}

function parseQuery(request: NextRequest): CourseSessionListQuery {
  return {
    teacherId: parseUuidLike(request.nextUrl.searchParams.get("teacherId")),
    studentGroupId: parseUuidLike(
      request.nextUrl.searchParams.get("studentGroupId"),
    ),
    roomId: parseUuidLike(request.nextUrl.searchParams.get("roomId")),
    day: parseDay(request.nextUrl.searchParams.get("day")),
    status: parseStatus(request.nextUrl.searchParams.get("status")),
    completedFrom: parseIsoDateString(
      request.nextUrl.searchParams.get("completedFrom"),
    ),
    completedTo: parseIsoDateString(
      request.nextUrl.searchParams.get("completedTo"),
    ),
    page: parsePositiveInteger(request.nextUrl.searchParams.get("page")),
    limit: parsePositiveInteger(request.nextUrl.searchParams.get("limit")),
  };
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json({ message: "Missing bearer token" }, { status: 401 });
    }

    const sessions = await getCourseSessionsWithBackend(accessToken, parseQuery(request));

    return NextResponse.json(sessions, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CourseSessionBackendError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { message: "Unable to load sessions" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json({ message: "Missing bearer token" }, { status: 401 });
    }

    const payload = await request.json();
    const createPayload = parseCreatePayload(payload);
    if (!createPayload) {
      return NextResponse.json(
        { message: "Invalid session payload" },
        { status: 400 },
      );
    }

    const session = await createCourseSessionWithBackend(accessToken, createPayload);
    return NextResponse.json(session, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof CourseSessionBackendError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { message: "Unable to create session" },
      { status: 500 },
    );
  }
}
