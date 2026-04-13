import { NextRequest, NextResponse } from "next/server";
import {
  CenterCostBackendError,
  toggleCenterCostActiveWithBackend,
} from "@/modules/center-cost/server/center-cost.dal";

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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
    const centerCost = await toggleCenterCostActiveWithBackend(accessToken, id);
    return NextResponse.json(centerCost, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CenterCostBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to update center cost status" },
      { status: 500 },
    );
  }
}
