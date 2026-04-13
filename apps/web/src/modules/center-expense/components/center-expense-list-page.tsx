"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, ReceiptText, RefreshCw } from "lucide-react";

import { FilterField } from "@/components/filters/filter-field";
import { SelectFilter } from "@/components/filters/select-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppAuth, useToast } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import { listSecretaries } from "@/modules/secretary/client/secretary-client";
import type { Secretary } from "@/modules/secretary/types/secretary.types";
import { listTeachers } from "@/modules/teacher/client/teacher-client";
import type { Teacher } from "@/modules/teacher/types/teacher.types";
import {
  createCenterExpense,
  listCenterExpenses,
} from "../client/center-expense-client";
import { CenterExpenseFormDialog } from "./center-expense-form-dialog";
import type {
  CenterExpense,
  CenterExpenseCreatePayload,
  CenterExpenseUserRole,
} from "../types/center-expense.types";

type CenterExpensePageState = {
  isLoadingExpenses: boolean;
  isLoadingUsers: boolean;
  errorMessage: string | null;
  expenses: CenterExpense[];
  teachers: Teacher[];
  secretaries: Secretary[];
};

type ExpenseUserOption = {
  value: string;
  label: string;
  role: CenterExpenseUserRole;
};

const initialState: CenterExpensePageState = {
  isLoadingExpenses: true,
  isLoadingUsers: true,
  errorMessage: null,
  expenses: [],
  teachers: [],
  secretaries: [],
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

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

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return dateFormatter.format(date);
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatExpenseRole(role: CenterExpenseUserRole) {
  switch (role) {
    case "TEACHER":
      return "Teacher";
    case "SECRETARY":
      return "Secretary";
    case "ADMIN":
      return "Admin";
    case "SUPER_ADMIN":
      return "Super admin";
    case "STUDENT":
      return "Student";
    default:
      return role;
  }
}

function getTeacherName(teacher: Teacher) {
  return `${teacher.firstName} ${teacher.lastName}`.trim();
}

function getSecretaryName(secretary: Secretary) {
  return `${secretary.firstName} ${secretary.lastName}`.trim();
}

function normalizeDateFilter(value: string | null) {
  const normalized = value?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function resolveServerMonthFilter(from: string, to: string) {
  if (!from || !to) {
    return undefined;
  }

  const fromMonth = from.slice(0, 7);
  const toMonth = to.slice(0, 7);
  return fromMonth === toMonth ? fromMonth : undefined;
}

function isExpenseInDateRange(
  expense: CenterExpense,
  fromDate: string,
  toDate: string,
) {
  if (fromDate && expense.date < fromDate) {
    return false;
  }

  if (toDate && expense.date > toDate) {
    return false;
  }

  return true;
}

export function CenterExpenseListPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user, setUser, clearUser } = useAppAuth();

  const [state, setState] = useState<CenterExpensePageState>(initialState);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const isSessionReady = user?.role === "ADMIN";
  const userFilter = searchParams.get("user")?.trim() ?? "";
  const fromDateFilter = normalizeDateFilter(searchParams.get("from"));
  const toDateFilter = normalizeDateFilter(searchParams.get("to"));
  const hasInvalidDateRange =
    fromDateFilter.length > 0 &&
    toDateFilter.length > 0 &&
    fromDateFilter > toDateFilter;

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

  const replaceQueryParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      mutate(nextParams);

      const currentQuery = searchParams.toString();
      const nextQuery = nextParams.toString();
      if (nextQuery === currentQuery) {
        return;
      }

      const target =
        nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const loadUsers = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoadingUsers: true,
    }));

    try {
      const [teachers, secretaries] = await Promise.all([
        listTeachers({
          isActive: true,
          page: 1,
          limit: 100,
        }),
        listSecretaries({
          isActive: true,
          page: 1,
          limit: 100,
        }),
      ]);

      setState((previous) => ({
        ...previous,
        isLoadingUsers: false,
        teachers,
        secretaries,
      }));
    } catch (error) {
      setState((previous) => ({
        ...previous,
        isLoadingUsers: false,
        errorMessage:
          previous.errorMessage ??
          extractErrorMessage(error, "Unable to load expense users."),
      }));
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    if (hasInvalidDateRange) {
      setState((previous) => ({
        ...previous,
        isLoadingExpenses: false,
        errorMessage:
          "The start date must be earlier than or equal to the end date.",
        expenses: [],
      }));
      return;
    }

    setState((previous) => ({
      ...previous,
      isLoadingExpenses: true,
      errorMessage: null,
    }));

    try {
      const allExpenses: CenterExpense[] = [];
      const month = resolveServerMonthFilter(fromDateFilter, toDateFilter);
      let page = 1;

      while (true) {
        const batch = await listCenterExpenses({
          user_id: userFilter || undefined,
          month,
          page,
          limit: 100,
        });

        allExpenses.push(...batch);

        if (batch.length < 100) {
          break;
        }

        page += 1;
      }

      setState((previous) => ({
        ...previous,
        isLoadingExpenses: false,
        errorMessage: null,
        expenses: allExpenses,
      }));
    } catch (error) {
      setState((previous) => ({
        ...previous,
        isLoadingExpenses: false,
        errorMessage: extractErrorMessage(
          error,
          "Unable to load center expenses.",
        ),
        expenses: [],
      }));
    }
  }, [fromDateFilter, hasInvalidDateRange, toDateFilter, userFilter]);

  const handleCreateExpense = useCallback(
    async (payload: CenterExpenseCreatePayload) => {
      try {
        await createCenterExpense(payload);
        await loadExpenses();
        toast.success(
          "Expense recorded",
          "The center expense was saved successfully.",
        );
      } catch (error) {
        toast.error(
          "Unable to record expense",
          extractErrorMessage(error, "Please review the form values and try again."),
        );
        throw error;
      }
    },
    [loadExpenses, toast],
  );

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void loadUsers();
  }, [isSessionReady, loadUsers]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void loadExpenses();
  }, [isSessionReady, loadExpenses]);

  const userOptions = useMemo<ExpenseUserOption[]>(() => {
    const teachers = state.teachers.map((teacher) => ({
      value: teacher.id,
      label: `${getTeacherName(teacher)} (Teacher)`,
      role: "TEACHER" as const,
    }));

    const secretaries = state.secretaries.map((secretary) => ({
      value: secretary.id,
      label: `${getSecretaryName(secretary)} (Secretary)`,
      role: "SECRETARY" as const,
    }));

    return [...teachers, ...secretaries].sort((left, right) =>
      left.label.localeCompare(right.label, undefined, {
        sensitivity: "base",
      }),
    );
  }, [state.secretaries, state.teachers]);

  const filteredExpenses = useMemo(
    () =>
      state.expenses.filter((expense) =>
        isExpenseInDateRange(expense, fromDateFilter, toDateFilter),
      ),
    [fromDateFilter, state.expenses, toDateFilter],
  );

  const summary = useMemo(() => {
    const totalAmount = filteredExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    return {
      visible: filteredExpenses.length,
      totalAmount,
      teachers: filteredExpenses.filter((expense) => expense.userRole === "TEACHER")
        .length,
      secretaries: filteredExpenses.filter(
        (expense) => expense.userRole === "SECRETARY",
      ).length,
    };
  }, [filteredExpenses]);

  const hasActiveFilters =
    userFilter.length > 0 ||
    fromDateFilter.length > 0 ||
    toDateFilter.length > 0;

  if (!isSessionReady) {
    return (
      <section className="mx-auto w-full max-w-7xl">
        <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
          <p className="text-sm text-muted-foreground">
            Validating center session...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-full space-y-4">
      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Center Expenses
            </h1>
            <p className="text-sm text-muted-foreground">
              Review recorded expenses and narrow the table by user and date
              range.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsCreateDialogOpen(true);
              }}
              disabled={state.isLoadingUsers || userOptions.length === 0}
            >
              <Plus className="mr-2 size-4" />
              Record expense
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void loadExpenses();
              }}
              disabled={state.isLoadingExpenses}
            >
              {state.isLoadingExpenses ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Visible expenses
            </p>
            <p className="mt-2 text-2xl font-semibold">{summary.visible}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              After current filters
            </p>
          </div>

          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Total amount
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(summary.totalAmount)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sum of visible expenses
            </p>
          </div>

          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Teacher expenses
            </p>
            <p className="mt-2 text-2xl font-semibold">{summary.teachers}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Visible rows linked to teachers
            </p>
          </div>

          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Secretary expenses
            </p>
            <p className="mt-2 text-2xl font-semibold">{summary.secretaries}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Visible rows linked to secretaries
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Filters</h2>
            <p className="text-sm text-muted-foreground">
              Use a user filter and exact date range to refine the table.
            </p>
          </div>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                router.replace(pathname, { scroll: false });
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <FilterField label="User">
            <SelectFilter
              value={userFilter}
              onChange={(value) => {
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("user", value);
                  } else {
                    params.delete("user");
                  }
                });
              }}
              options={userOptions}
              emptyLabel="All teachers and secretaries"
              disabled={state.isLoadingUsers || state.isLoadingExpenses}
            />
          </FilterField>

          <FilterField label="From date">
            <Input
              type="date"
              value={fromDateFilter}
              onChange={(event) => {
                const value = event.currentTarget.value;
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("from", value);
                  } else {
                    params.delete("from");
                  }
                });
              }}
              disabled={state.isLoadingExpenses}
            />
          </FilterField>

          <FilterField label="To date">
            <Input
              type="date"
              value={toDateFilter}
              onChange={(event) => {
                const value = event.currentTarget.value;
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("to", value);
                  } else {
                    params.delete("to");
                  }
                });
              }}
              disabled={state.isLoadingExpenses}
            />
          </FilterField>
        </div>
      </div>

      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Expenses table</h2>
        </div>

        {state.errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.errorMessage}
          </div>
        ) : null}

        {state.isLoadingExpenses ? (
          <div className="mt-4 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            Loading expenses...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            No expenses match the current filters.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-3 py-3 font-medium text-foreground">
                      {expense.userName}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatExpenseRole(expense.userRole)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {expense.description}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatDate(expense.created_at.slice(0, 10))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CenterExpenseFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        teachers={state.teachers}
        secretaries={state.secretaries}
        onCreate={handleCreateExpense}
      />
    </section>
  );
}
