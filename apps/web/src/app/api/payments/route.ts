import { NextRequest, NextResponse } from "next/server";
import {
  createPaymentWithBackend,
  getPaymentsWithBackend,
  PaymentBackendError,
} from "@/modules/payment/server/payment.dal";
import type {
  PaymentCreatePayload,
  PaymentListQuery,
} from "@/modules/payment/types/payment.types";

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

function parseQuery(request: NextRequest): PaymentListQuery {
  const searchParams = request.nextUrl.searchParams;

  return {
    student_id: searchParams.get("student_id")?.trim() || undefined,
    teacher_id: searchParams.get("teacher_id")?.trim() || undefined,
    student_group_id: searchParams.get("student_group_id")?.trim() || undefined,
    status: searchParams.get("status")?.trim().toUpperCase() as
      | PaymentListQuery["status"]
      | undefined,
    payment_from: searchParams.get("payment_from")?.trim() || undefined,
    payment_to: searchParams.get("payment_to")?.trim() || undefined,
    page: parseInteger(searchParams.get("page")),
    limit: parseInteger(searchParams.get("limit")),
  };
}

function parseCreatePayload(payload: unknown): PaymentCreatePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const student_id =
    typeof body.student_id === "string" ? body.student_id.trim() : "";
  const teacher_id =
    typeof body.teacher_id === "string" ? body.teacher_id.trim() : "";
  const student_group_id =
    typeof body.student_group_id === "string"
      ? body.student_group_id.trim()
      : undefined;
  const amount =
    typeof body.amount === "number"
      ? body.amount
      : typeof body.amount === "string"
        ? Number(body.amount)
        : Number.NaN;

  if (!student_id || !teacher_id || !Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return {
    student_id,
    teacher_id,
    student_group_id: student_group_id || undefined,
    amount,
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

    const payments = await getPaymentsWithBackend(accessToken, parseQuery(request));
    return NextResponse.json(payments, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof PaymentBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to load payments" },
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
        { message: "Invalid payment payload" },
        { status: 400 },
      );
    }

    const payment = await createPaymentWithBackend(accessToken, createPayload);
    return NextResponse.json(payment, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof PaymentBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to record payment" },
      { status: 500 },
    );
  }
}
