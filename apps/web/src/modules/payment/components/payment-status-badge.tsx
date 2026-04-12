"use client";

import type { PaymentStatus } from "../types/payment.types";

type PaymentStatusBadgeProps = {
  status: PaymentStatus;
};

export function getPaymentStatusLabel(status: PaymentStatus) {
  if (status === "PARTIALLY_PAID") {
    return "Partial";
  }

  if (status === "UNPAID") {
    return "Unpaid";
  }

  return "Paid";
}

function getPaymentStatusClasses(status: PaymentStatus) {
  if (status === "PAID") {
    return "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  }

  if (status === "PARTIALLY_PAID") {
    return "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300";
  }

  return "border-rose-500/30 bg-rose-500/12 text-rose-700 dark:text-rose-300";
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getPaymentStatusClasses(
        status,
      )}`}
    >
      {getPaymentStatusLabel(status)}
    </span>
  );
}
