import { NextRequest, NextResponse } from "next/server";
import {
  cancelCourseSessionWithBackend,
  CourseSessionBackendError,
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json({ message: "Missing bearer token" }, { status: 401 });
    }

    const { id } = await context.params;
    const sessionId = id.trim();
    if (!sessionId) {
      return NextResponse.json({ message: "Invalid session id" }, { status: 400 });
    }

    await cancelCourseSessionWithBackend(accessToken, sessionId);
    return new NextResponse(null, { status: 204 });
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
      { message: "Unable to cancel session" },
      { status: 500 },
    );
  }
}
