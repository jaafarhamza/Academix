import { NextRequest, NextResponse } from "next/server";
import {
  getPaymentReceiptWithBackend,
  PaymentBackendError,
} from "@/modules/payment/server/payment.dal";

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
    const paymentId = id.trim();
    if (!paymentId) {
      return NextResponse.json(
        { message: "Invalid payment id" },
        { status: 400 },
      );
    }

    const receipt = await getPaymentReceiptWithBackend(accessToken, paymentId);

    return new Response(receipt.body, {
      status: 200,
      headers: {
        "Content-Type": receipt.contentType,
        "Cache-Control": "no-store",
        ...(receipt.contentDisposition
          ? { "Content-Disposition": receipt.contentDisposition }
          : {}),
      },
    });
  } catch (error: unknown) {
    if (error instanceof PaymentBackendError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Unable to open payment receipt" },
      { status: 500 },
    );
  }
}
