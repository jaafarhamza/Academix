import { NextRequest, NextResponse } from "next/server";
import {
  getStudentPaymentHistoryWithBackend,
  StudentBackendError,
} from "@/modules/student/server/student.dal";

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
    const studentId = id.trim();
    if (!studentId) {
      return NextResponse.json(
        { message: "Invalid student id" },
        { status: 400 },
      );
    }

    const paymentHistory = await getStudentPaymentHistoryWithBackend(
      accessToken,
      studentId,
    );
    return NextResponse.json(paymentHistory, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof StudentBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load student payment history" },
      { status: 500 },
    );
  }
}
