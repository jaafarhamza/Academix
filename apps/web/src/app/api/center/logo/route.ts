import { NextRequest, NextResponse } from "next/server";
import {
  CenterBackendError,
  uploadCenterLogoWithBackend,
} from "@/modules/center/server/center-auth.dal";

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

export async function POST(request: NextRequest) {
  try {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { message: "Missing bearer token" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "A logo file is required" },
        { status: 400 },
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { message: "Uploaded file is empty" },
        { status: 400 },
      );
    }

    const payload = await uploadCenterLogoWithBackend(accessToken, file);
    return NextResponse.json(payload, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CenterBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to upload center logo" },
      { status: 500 },
    );
  }
}
