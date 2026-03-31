import { NextRequest, NextResponse } from "next/server";
import {
  getStudentGroupStatusWithBackend,
  StudentGroupBackendError,
} from "@/modules/student-group/server/student-group.dal";

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

export async function GET(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const status = await getStudentGroupStatusWithBackend(accessToken);
    return NextResponse.json(status, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof StudentGroupBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load student-group status" },
      { status: 500 },
    );
  }
}
