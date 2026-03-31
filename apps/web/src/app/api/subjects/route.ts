import { NextRequest, NextResponse } from "next/server";
import {
  createSubjectWithBackend,
  getSubjectsWithBackend,
  SubjectBackendError,
} from "@/modules/subject/server/subject.dal";
import type {
  SubjectCreatePayload,
  SubjectListQuery,
} from "@/modules/subject/types/subject.types";

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

function parseInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseQuery(request: NextRequest): SubjectListQuery {
  const searchValue = request.nextUrl.searchParams.get("search");
  const normalizedSearch =
    typeof searchValue === "string" && searchValue.trim().length > 0
      ? searchValue.trim()
      : undefined;

  return {
    search: normalizedSearch,
    page: parseInteger(request.nextUrl.searchParams.get("page")),
    limit: parseInteger(request.nextUrl.searchParams.get("limit")),
  };
}

function parseCreatePayload(payload: unknown): SubjectCreatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  if (!name || !description) {
    return null;
  }

  return {
    name,
    description,
  };
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

    const subjects = await getSubjectsWithBackend(accessToken, parseQuery(request));
    return NextResponse.json(subjects, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof SubjectBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load subjects" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const payload = await request.json();
    const createPayload = parseCreatePayload(payload);

    if (!createPayload) {
      return NextResponse.json(
        { message: "Invalid subject payload" },
        { status: 400 },
      );
    }

    const subject = await createSubjectWithBackend(accessToken, createPayload);
    return NextResponse.json(subject, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof SubjectBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to create subject" },
      { status: 500 },
    );
  }
}
