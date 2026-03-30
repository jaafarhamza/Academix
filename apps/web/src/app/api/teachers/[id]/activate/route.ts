import { NextRequest, NextResponse } from "next/server";
import {
  activateTeacherWithBackend,
  TeacherBackendError,
} from "@/modules/teacher/server/teacher.dal";

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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const teacherId = id.trim();
    if (!teacherId) {
      return NextResponse.json(
        { message: "Invalid teacher id" },
        { status: 400 },
      );
    }

    await activateTeacherWithBackend(accessToken, teacherId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof TeacherBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to activate teacher" },
      { status: 500 },
    );
  }
}
