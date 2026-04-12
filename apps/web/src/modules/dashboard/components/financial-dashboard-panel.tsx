"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks";
import { getFinancialDashboard } from "../client/dashboard-client";
import { FinancialComparisonBarChart } from "./financial-comparison-bar-chart";
import type {
  FinancialDashboard,
  FinancialDashboardQuery,
  FinancialDashboardPeriod,
} from "../types/dashboard.types";

type FinancialDashboardPanelProps = {
  enabled: boolean;
};

type FinancialDashboardState = {
  isLoading: boolean;
  errorMessage: string | null;
  dashboard: FinancialDashboard | null;
};

const initialState: FinancialDashboardState = {
  isLoading: true,
  errorMessage: null,
  dashboard: null,
};

const periodOptions: Array<{
  value: FinancialDashboardPeriod;
  label: string;
}> = [
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "CUSTOM", label: "Custom range" },
];

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "MAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function extractErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getCurrentMonthDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: formatDateInputValue(start),
    to: formatDateInputValue(end),
  };
}

function BreakdownTable(props: {
  title: string;
  subtitle: string;
  rows: Array<{
    id: string | null;
    name: string;
    collected: number;
    expected: number;
    outstanding: number;
    paymentsCount: number;
  }>;
}) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <div>
        <h3 className="text-sm font-semibold">{props.title}</h3>
        <p className="text-xs text-muted-foreground">{props.subtitle}</p>
      </div>

      {props.rows.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed px-3 py-6 text-xs text-muted-foreground">
          No payments found for this breakdown in the selected period.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Collected</th>
                <th className="px-2 py-2 font-medium">Expected</th>
                <th className="px-2 py-2 font-medium">Outstanding</th>
                <th className="px-2 py-2 font-medium">Payments</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row) => (
                <tr key={row.id ?? row.name} className="border-b last:border-b-0">
                  <td className="px-2 py-3 font-medium">{row.name}</td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {formatCurrency(row.collected)}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {formatCurrency(row.expected)}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {formatCurrency(row.outstanding)}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {row.paymentsCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function FinancialDashboardPanel({
  enabled,
}: FinancialDashboardPanelProps) {
  const toast = useToast();
  const [period, setPeriod] = useState<FinancialDashboardPeriod>("THIS_MONTH");
  const [query, setQuery] = useState<FinancialDashboardQuery>({
    period: "THIS_MONTH",
  });
  const [customRange, setCustomRange] = useState(getCurrentMonthDateRange);
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);
  const [state, setState] = useState<FinancialDashboardState>(initialState);

  const loadDashboard = useCallback(async () => {
    const dashboard = await getFinancialDashboard(query);
    return dashboard;
  }, [query]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const dashboard = await loadDashboard();
        if (isCancelled) {
          return;
        }

        setState({
          isLoading: false,
          errorMessage: null,
          dashboard,
        });
      } catch (error: unknown) {
        if (isCancelled) {
          return;
        }

        setState({
          isLoading: false,
          errorMessage: extractErrorMessage(
            error,
            "Unable to load financial dashboard.",
          ),
          dashboard: null,
        });
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [enabled, loadDashboard]);

  const reloadDashboard = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const dashboard = await loadDashboard();
      setState({
        isLoading: false,
        errorMessage: null,
        dashboard,
      });
    } catch (error: unknown) {
      setState({
        isLoading: false,
        errorMessage: extractErrorMessage(
          error,
          "Unable to load financial dashboard.",
        ),
        dashboard: null,
      });
      throw error;
    }
  }, [loadDashboard]);

  const activeLabel =
    periodOptions.find((option) => option.value === period)?.label ?? "This month";

  const validateCustomRange = useCallback(() => {
    if (customRange.from.trim().length === 0 || customRange.to.trim().length === 0) {
      return "Please choose both start and end dates.";
    }

    if (customRange.from > customRange.to) {
      return "The start date must be earlier than or equal to the end date.";
    }

    return null;
  }, [customRange.from, customRange.to]);

  const applyCustomRange = useCallback(async () => {
    const validationMessage = validateCustomRange();
    if (validationMessage) {
      setCustomRangeError(validationMessage);
      throw new Error(validationMessage);
    }

    setCustomRangeError(null);
    setState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));
    setQuery({
      period: "CUSTOM",
      from: customRange.from,
      to: customRange.to,
    });
  }, [customRange.from, customRange.to, validateCustomRange]);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">
              Financial snapshot
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare collected cash versus expected cash for the selected period.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={period === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPeriod(option.value);
                setCustomRangeError(null);

                if (option.value === "CUSTOM") {
                  setCustomRange((previous) => {
                    if (
                      previous.from.trim().length > 0 &&
                      previous.to.trim().length > 0
                    ) {
                      return previous;
                    }

                    return state.dashboard?.range ?? getCurrentMonthDateRange();
                  });
                  return;
                }

                setState((previous) => ({
                  ...previous,
                  isLoading: true,
                  errorMessage: null,
                }));
                setQuery({ period: option.value });
              }}
              disabled={state.isLoading}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {period === "CUSTOM" ? (
        <div className="mt-4 rounded-xl border bg-background/70 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="space-y-2 text-sm">
              <span className="font-medium">From</span>
              <input
                type="date"
                value={customRange.from}
                onChange={(event) => {
                  setCustomRangeError(null);
                  setCustomRange((previous) => ({
                    ...previous,
                    from: event.target.value,
                  }));
                }}
                className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs"
                max={customRange.to || undefined}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">To</span>
              <input
                type="date"
                value={customRange.to}
                onChange={(event) => {
                  setCustomRangeError(null);
                  setCustomRange((previous) => ({
                    ...previous,
                    to: event.target.value,
                  }));
                }}
                className="flex h-9 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs"
                min={customRange.from || undefined}
              />
            </label>

            <Button
              type="button"
              onClick={() => {
                void applyCustomRange().catch((error: unknown) => {
                  toast.error(
                    "Unable to load custom range",
                    extractErrorMessage(error, "Please check the selected dates."),
                  );
                });
              }}
              disabled={state.isLoading}
            >
              Apply range
            </Button>
          </div>

          {customRangeError ? (
            <p className="mt-3 text-sm text-destructive">{customRangeError}</p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Select a start and end date to compare collected versus expected revenue in a custom period.
            </p>
          )}
        </div>
      ) : null}

      {state.errorMessage ? (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="flex items-center justify-between gap-3">
            <span>{state.errorMessage}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void reloadDashboard().catch((error: unknown) => {
                  toast.error(
                    "Unable to refresh dashboard",
                    extractErrorMessage(error, "Please try again in a moment."),
                  );
                });
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      {state.isLoading ? (
        <div className="mt-4 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
          Loading financial dashboard...
        </div>
      ) : state.dashboard ? (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Collected
              </p>
              <div className="mt-2 flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-500" />
                <p className="text-2xl font-semibold">
                  {formatCurrency(state.dashboard.totals.collected)}
                </p>
              </div>
            </div>
            <div className="rounded-xl border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Expected
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Wallet className="size-4 text-primary" />
                <p className="text-2xl font-semibold">
                  {formatCurrency(state.dashboard.totals.expected)}
                </p>
              </div>
            </div>
            <div className="rounded-xl border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Outstanding
              </p>
              <div className="mt-2 flex items-center gap-2">
                <TrendingDown className="size-4 text-amber-500" />
                <p className="text-2xl font-semibold">
                  {formatCurrency(state.dashboard.totals.outstanding)}
                </p>
              </div>
            </div>
            <div className="rounded-xl border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Collection rate
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {state.dashboard.totals.collectionRate.toFixed(2)}%
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {state.dashboard.totals.paymentsCount} payments in {activeLabel.toLowerCase()}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border bg-background/70 p-4">
              <div className="flex items-center gap-2">
                <ReceiptText className="size-4 text-amber-500" />
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Outstanding payments
                </p>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {state.dashboard.outstandingSummary.count}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Payment records still carrying a remaining balance
              </p>
            </div>
            <div className="rounded-xl border bg-background/70 p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="size-4 text-amber-500" />
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Outstanding total
                </p>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {formatCurrency(state.dashboard.outstandingSummary.totalAmount)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Remaining unpaid amount for the selected period
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <BreakdownTable
              title="Revenue by group"
              subtitle="Collected versus expected totals per student group."
              rows={state.dashboard.breakdown.byGroup}
            />
            <BreakdownTable
              title="Revenue by teacher"
              subtitle="Collected versus expected totals per teacher."
              rows={state.dashboard.breakdown.byTeacher}
            />
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void reloadDashboard().catch((error: unknown) => {
                    toast.error(
                      "Unable to refresh dashboard",
                      extractErrorMessage(error, "Please try again in a moment."),
                    );
                  });
                }}
              >
                Refresh
              </Button>
            </div>

            <div className="mt-4">
              <FinancialComparisonBarChart
                title="Collected vs expected"
                subtitle={`${state.dashboard.range.from} to ${state.dashboard.range.to}`}
                points={state.dashboard.series}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
