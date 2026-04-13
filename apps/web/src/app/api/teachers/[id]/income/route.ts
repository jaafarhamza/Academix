import { NextRequest, NextResponse } from "next/server";
import {
  getTeacherIncomeWithBackend,
  TeacherBackendError,
} from "@/modules/teacher/server/teacher.dal";
import type { TeacherIncomeQuery } from "@/modules/teacher/types/teacher.types";

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

function parseMonth(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(normalized) ? normalized : undefined;
}

function parseQuery(request: NextRequest): TeacherIncomeQuery {
  return {
    month: parseMonth(request.nextUrl.searchParams.get("month")),
  };
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
    const teacherId = id.trim();
    if (!teacherId) {
      return NextResponse.json(
        { message: "Invalid teacher id" },
        { status: 400 },
      );
    }

    const teacherIncome = await getTeacherIncomeWithBackend(
      accessToken,
      teacherId,
      parseQuery(request),
    );
    return NextResponse.json(teacherIncome, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof TeacherBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load teacher income" },
      { status: 500 },
    );
  }
}
