import { NextRequest, NextResponse } from "next/server";
import {
  getStudentGroupByIdWithBackend,
  StudentGroupBackendError,
} from "@/modules/student-group/server/student-group.dal";

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
