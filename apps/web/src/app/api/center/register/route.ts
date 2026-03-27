import { NextResponse } from "next/server";
import {
  CenterBackendError,
  registerCenterWithBackend,
} from "@/modules/center/server/center-auth.dal";
import type { CenterRegistrationPayload } from "@/modules/center/types/center-auth.types";

function isValidRegistrationPayload(
  payload: unknown,
): payload is CenterRegistrationPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const body = payload as Record<string, unknown>;
  return (
    typeof body.firstName === "string" &&
    body.firstName.trim().length > 0 &&
    typeof body.lastName === "string" &&
    body.lastName.trim().length > 0 &&
    typeof body.centerName === "string" &&
    body.centerName.trim().length > 0 &&
    typeof body.email === "string" &&
    body.email.trim().length > 0 &&
    typeof body.password === "string" &&
    body.password.length > 0 &&
    typeof body.phone === "string" &&
    body.phone.trim().length > 0
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (!isValidRegistrationPayload(payload)) {
      return NextResponse.json(
        { message: "Invalid registration payload" },
        { status: 400 },
      );
    }

    const createdCenter = await registerCenterWithBackend({
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      centerName: payload.centerName.trim(),
      email: payload.email.trim(),
      password: payload.password,
      phone: payload.phone.trim(),
    });

    return NextResponse.json(createdCenter, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof CenterBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to register center" },
      { status: 500 },
    );
  }
}
