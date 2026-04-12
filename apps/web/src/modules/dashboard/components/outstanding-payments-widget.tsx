"use client";

import Link from "next/link";
import { ArrowUpRight, CircleAlert, ReceiptText } from "lucide-react";

import { Button } from "@/components/ui/button";

type OutstandingPaymentsWidgetProps = {
  count: number;
  totalAmount: number;
  from: string;
  to: string;
  formatCurrency: (value: number) => string;
};

function buildPaymentsHref(input: {
  from: string;
  to: string;
  status?: "UNPAID" | "PARTIALLY_PAID";
}) {
  const params = new URLSearchParams();
  params.set("from", input.from);
  params.set("to", input.to);

  if (input.status) {
    params.set("status", input.status);
  }

  return `/center/payments?${params.toString()}`;
}

export function OutstandingPaymentsWidget({
  count,
  totalAmount,
  from,
  to,
  formatCurrency,
}: OutstandingPaymentsWidgetProps) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CircleAlert className="size-4 text-amber-500" />
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Outstanding actions
            </p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{count}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCurrency(totalAmount)} still open in the selected period
          </p>
        </div>

        <ReceiptText className="mt-1 size-4 text-muted-foreground" />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Button asChild type="button" variant="outline" size="sm">
          <Link href={buildPaymentsHref({ from, to, status: "UNPAID" })}>
            Unpaid
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>

        <Button asChild type="button" variant="outline" size="sm">
          <Link href={buildPaymentsHref({ from, to, status: "PARTIALLY_PAID" })}>
            Partial
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>

        <Button asChild type="button" variant="outline" size="sm">
          <Link href={buildPaymentsHref({ from, to })}>
            All payments
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Quick links keep the current dashboard period and open the payments page with matching filters.
      </p>
    </div>
  );
}
