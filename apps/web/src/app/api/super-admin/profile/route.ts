import { NextRequest, NextResponse } from "next/server";
import {
  getSuperAdminProfileWithBackend,
  SuperAdminBackendError,
} from "@/modules/super-admin/server/super-admin-auth.dal";

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

    const profile = await getSuperAdminProfileWithBackend(accessToken);
    return NextResponse.json(profile, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof SuperAdminBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load super admin profile" },
      { status: 500 },
    );
  }
}
