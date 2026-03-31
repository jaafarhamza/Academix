import { NextRequest, NextResponse } from "next/server";
import {
  deleteTeacherSubjectWithBackend,
  TeacherSubjectBackendError,
} from "@/modules/teacher-subject/server/teacher-subject.dal";

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
    const assignmentId = id.trim();
    if (!assignmentId) {
      return NextResponse.json(
        { message: "Invalid assignment id" },
        { status: 400 },
      );
    }

    await deleteTeacherSubjectWithBackend(accessToken, assignmentId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof TeacherSubjectBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to remove teacher-subject assignment" },
      { status: 500 },
    );
  }
}
