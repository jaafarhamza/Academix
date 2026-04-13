"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Calculator,
  Loader2,
  ReceiptText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppAuth } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import { getTeacherDetail, getTeacherIncome } from "../client/teacher-client";
import type { TeacherDetail, TeacherMonthlyIncome } from "../types/teacher.types";

type TeacherIncomePageProps = {
  teacherId: string;
};

type TeacherIncomePageState = {
  isLoading: boolean;
  errorMessage: string | null;
  teacher: TeacherDetail | null;
  income: TeacherMonthlyIncome | null;
};

const initialState: TeacherIncomePageState = {
  isLoading: true,
  errorMessage: null,
  teacher: null,
  income: null,
};

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

function getTeacherName(teacher: TeacherDetail) {
  return `${teacher.firstName} ${teacher.lastName}`.trim();
}

function getCurrentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function getMonthLabel(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return value;
  }

  const [yearText, monthText] = value.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1, 1);
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function TeacherIncomePage({ teacherId }: TeacherIncomePageProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, clearUser } = useAppAuth();

  const [state, setState] = useState<TeacherIncomePageState>(initialState);

  const isSessionReady = user?.role === "ADMIN";
  const monthFilter = searchParams.get("month")?.trim() || getCurrentMonthValue();

  useEffect(() => {
    if (isSessionReady) {
      return;
    }

    let isCancelled = false;

    async function initializeCenterSession() {
      try {
        const session = await ensureCenterSession();
        if (isCancelled) {
          return;
        }

        setUser({
          id: session.auth.center.id,
          centerId: session.auth.center.id,
          role: "ADMIN",
          fullName:
            session.profile?.centerName ?? session.auth.center.centerName,
          email: session.auth.center.email,
        });
      } catch {
        if (isCancelled) {
          return;
        }

        clearUser();
        router.replace("/center/login");
      }
    }

    void initializeCenterSession();

    return () => {
      isCancelled = true;
    };
  }, [clearUser, isSessionReady, router, setUser]);

  const loadTeacherIncome = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const [teacher, income] = await Promise.all([
        getTeacherDetail(teacherId),
        getTeacherIncome(teacherId, {
          month: monthFilter,
        }),
      ]);

      setState({
        isLoading: false,
        errorMessage: null,
        teacher,
        income,
      });
    } catch (error) {
      setState({
        isLoading: false,
        errorMessage: extractErrorMessage(
          error,
          "Unable to load teacher income.",
        ),
        teacher: null,
        income: null,
      });
    }
  }, [monthFilter, teacherId]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    queueMicrotask(() => {
      void loadTeacherIncome();
    });
  }, [isSessionReady, loadTeacherIncome]);

  const totalCosts = useMemo(
    () => state.income?.deduction_breakdown.total ?? 0,
    [state.income],
  );

  if (!isSessionReady) {
    return (
      <section className="mx-auto w-full max-w-6xl">
        <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
          <p className="text-sm text-muted-foreground">
            Validating center session...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Teacher Income
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monthly breakdown for one teacher: payments minus costs plus
              expenses equals net income.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1">
              <span className="text-xs mr-2 font-medium uppercase tracking-wide text-muted-foreground">
                Month 
              </span>
              <Input
                type="month"
                value={monthFilter}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  const params = new URLSearchParams(searchParams.toString());

                  if (nextValue) {
                    params.set("month", nextValue);
                  } else {
                    params.delete("month");
                  }

                  const nextQuery = params.toString();
                  const target =
                    nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
                  router.replace(target, { scroll: false });
                }}
                className="w-45"
              />
            </label>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void loadTeacherIncome();
              }}
              disabled={state.isLoading}
            >
              {state.isLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {state.teacher ? (
          <div className="mt-4 rounded-xl border bg-background/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {getTeacherName(state.teacher)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {state.teacher.email}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>Monthly view: {getMonthLabel(monthFilter)}</span>
                <span>
                  Subjects:{" "}
                  {state.teacher.subjects.length > 0
                    ? state.teacher.subjects.map((subject) => subject.name).join(", ")
                    : "No subjects assigned"}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {state.errorMessage ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.errorMessage}
        </div>
      ) : null}

      {state.isLoading ? (
        <div className="rounded-xl border border-dashed bg-card/90 px-4 py-8 text-sm text-muted-foreground shadow-xs">
          Loading teacher income...
        </div>
      ) : state.income ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border bg-card/90 p-4 shadow-xs">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Collected payments
              </p>
              <div className="mt-2 flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-500" />
                <p className="text-2xl font-semibold">
                  {formatCurrency(state.income.collected_payments)}
                </p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {state.income.paid_students} paid students in {getMonthLabel(state.income.month)}
              </p>
            </div>

            <div className="rounded-xl border bg-card/90 p-4 shadow-xs">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Costs
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Calculator className="size-4 text-amber-500" />
                <p className="text-2xl font-semibold">
                  {formatCurrency(totalCosts)}
                </p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Deduction rules resolved for this teacher and month
              </p>
            </div>

            <div className="rounded-xl border bg-card/90 p-4 shadow-xs">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Expenses
              </p>
              <div className="mt-2 flex items-center gap-2">
                <TrendingDown className="size-4 text-rose-500" />
                <p className="text-2xl font-semibold">
                  {formatCurrency(state.income.expenses)}
                </p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Center expenses recorded for this teacher
              </p>
            </div>

            <div className="rounded-xl border bg-card/90 p-4 shadow-xs">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Net income
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Wallet className="size-4 text-primary" />
                <p className="text-2xl font-semibold">
                  {formatCurrency(state.income.net_income)}
                </p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Final monthly result after costs and expenses
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
            <div className="flex items-center gap-2">
              <ReceiptText className="size-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Income formula</h2>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
              <div className="rounded-xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Payments
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {formatCurrency(state.income.collected_payments)}
                </p>
              </div>
              <div className="hidden items-center justify-center lg:flex">
                <span className="text-xl font-semibold text-muted-foreground">-</span>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Costs
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {formatCurrency(totalCosts)}
                </p>
              </div>
              <div className="hidden items-center justify-center lg:flex">
                <span className="text-xl font-semibold text-muted-foreground">+</span>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Expenses
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {formatCurrency(state.income.expenses)}
                </p>
              </div>
              <div className="hidden items-center justify-center lg:flex">
                <ArrowRight className="size-5 text-muted-foreground" />
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Net
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {formatCurrency(state.income.net_income)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
              <h2 className="text-base font-semibold">Deduction breakdown</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cost resolution prefers per-teacher rules, then falls back to global rules of the same deduction type.
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Type</th>
                      <th className="px-2 py-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-2 py-3">Percent of total</td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {formatCurrency(state.income.deduction_breakdown.percentage_of_total)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-2 py-3">Percent per student</td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {formatCurrency(state.income.deduction_breakdown.percentage_per_student)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-2 py-3">Fixed per student</td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {formatCurrency(state.income.deduction_breakdown.fixed_per_student)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-3 font-medium">Total costs</td>
                      <td className="px-2 py-3 font-medium">
                        {formatCurrency(state.income.deduction_breakdown.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
              <h2 className="text-base font-semibold">Monthly notes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Quick reading guide for this month’s teacher result.
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl border bg-background/70 p-4">
                  <p className="font-medium">Payments collected</p>
                  <p className="mt-1 text-muted-foreground">
                    Money recorded on payments where this teacher is attached for {getMonthLabel(state.income.month)}.
                  </p>
                </div>
                <div className="rounded-xl border bg-background/70 p-4">
                  <p className="font-medium">Costs applied</p>
                  <p className="mt-1 text-muted-foreground">
                    Costs are resolved by deduction type using the applicable per-teacher rule first, with global fallback if no teacher-specific rule exists.
                  </p>
                </div>
                <div className="rounded-xl border bg-background/70 p-4">
                  <p className="font-medium">Expenses counted</p>
                  <p className="mt-1 text-muted-foreground">
                    Expenses come from center expense records linked to this teacher in the same month.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
