"use client";

import { ArrowLeft, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FinancialDashboardPanel } from "./financial-dashboard-panel";

export function FinancialDashboardPage() {
  const router = useRouter();

  return (
    <section className="mx-auto flex w-full max-w-full flex-col gap-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                router.push("/center");
              }}
            >
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold tracking-tight">
                Financial Snapshot
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Track collected cash versus expected cash over time and monitor outstanding balances.
            </p>
          </div>
        </div>
      </div>

      <FinancialDashboardPanel enabled />
    </section>
  );
}
