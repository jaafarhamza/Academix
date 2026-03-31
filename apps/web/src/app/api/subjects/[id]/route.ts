import { NextRequest, NextResponse } from "next/server";
import {
  deleteSubjectWithBackend,
  getSubjectByIdWithBackend,
  SubjectBackendError,
  updateSubjectWithBackend,
} from "@/modules/subject/server/subject.dal";
import type { SubjectUpdatePayload } from "@/modules/subject/types/subject.types";

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

function parseOptionalTextField(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseUpdatePayload(payload: unknown): SubjectUpdatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const result: SubjectUpdatePayload = {};

  if ("name" in body) {
    const name = parseOptionalTextField(body.name);
    if (!name) {
      return null;
    }
    result.name = name;
  }

  if ("description" in body) {
    const description = parseOptionalTextField(body.description);
    if (!description) {
      return null;
    }
    result.description = description;
  }

  return Object.keys(result).length > 0 ? result : null;
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
    const subjectId = id.trim();
    if (!subjectId) {
      return NextResponse.json(
        { message: "Invalid subject id" },
        { status: 400 },
      );
    }

    const payload = await request.json();
    const updatePayload = parseUpdatePayload(payload);
    if (!updatePayload) {
      return NextResponse.json(
        { message: "Invalid subject update payload" },
        { status: 400 },
      );
    }

    const subject = await updateSubjectWithBackend(
      accessToken,
      subjectId,
      updatePayload,
    );
    return NextResponse.json(subject, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof SubjectBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to update subject" },
      { status: 500 },
    );
  }
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
    const subjectId = id.trim();
    if (!subjectId) {
      return NextResponse.json(
        { message: "Invalid subject id" },
        { status: 400 },
      );
    }

    const subject = await getSubjectByIdWithBackend(accessToken, subjectId);
    return NextResponse.json(subject, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof SubjectBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load subject details" },
      { status: 500 },
    );
  }
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
    const subjectId = id.trim();
    if (!subjectId) {
      return NextResponse.json(
        { message: "Invalid subject id" },
        { status: 400 },
      );
    }

    await deleteSubjectWithBackend(accessToken, subjectId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof SubjectBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to delete subject" },
      { status: 500 },
    );
  }
}
