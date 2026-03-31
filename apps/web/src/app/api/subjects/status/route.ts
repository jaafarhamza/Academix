import { NextRequest, NextResponse } from "next/server";
import {
  getSubjectStatusWithBackend,
  SubjectBackendError,
} from "@/modules/subject/server/subject.dal";

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

    const status = await getSubjectStatusWithBackend(accessToken);
    return NextResponse.json(status, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof SubjectBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load subject status" },
      { status: 500 },
    );
  }
}
