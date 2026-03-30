import { NextRequest, NextResponse } from "next/server";
import {
  activateSecretaryWithBackend,
  SecretaryBackendError,
} from "@/modules/secretary/server/secretary.dal";

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
    const secretaryId = id.trim();
    if (!secretaryId) {
      return NextResponse.json(
        { message: "Invalid secretary id" },
        { status: 400 },
      );
    }

    await activateSecretaryWithBackend(accessToken, secretaryId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof SecretaryBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to activate secretary" },
      { status: 500 },
    );
  }
}
