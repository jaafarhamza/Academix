import { NextRequest, NextResponse } from "next/server";
import {
  CourseSessionBackendError,
  getTeacherCourseSessionsWithBackend,
} from "@/modules/course-session/server/course-session.dal";

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

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json({ message: "Missing bearer token" }, { status: 401 });
    }

    const { id } = await context.params;
    const teacherId = id.trim();
    if (!teacherId) {
      return NextResponse.json({ message: "Invalid teacher id" }, { status: 400 });
    }

    const sessions = await getTeacherCourseSessionsWithBackend(accessToken, teacherId);
    return NextResponse.json(sessions, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CourseSessionBackendError) {
      return NextResponse.json(
        {
          message: error.message,
          conflicts: error.conflicts,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load teacher schedule" },
      { status: 500 },
    );
  }
}
