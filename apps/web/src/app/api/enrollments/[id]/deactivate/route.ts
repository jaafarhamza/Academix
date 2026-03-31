import { NextRequest, NextResponse } from "next/server";
import {
  deactivateEnrollmentWithBackend,
  EnrollmentBackendError,
} from "@/modules/enrollment/server/enrollment.dal";

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
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const enrollmentId = id.trim();
    if (!enrollmentId) {
      return NextResponse.json(
        { message: "Invalid enrollment id" },
        { status: 400 },
      );
    }

    await deactivateEnrollmentWithBackend(accessToken, enrollmentId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof EnrollmentBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to deactivate enrollment" },
      { status: 500 },
    );
  }
}
