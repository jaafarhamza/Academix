"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgePercent, Loader2, Plus, RefreshCw } from "lucide-react";

import { FilterField } from "@/components/filters/filter-field";
import { SelectFilter } from "@/components/filters/select-filter";
import { Button } from "@/components/ui/button";
import { useAppAuth, useToast } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import { listTeachers } from "@/modules/teacher/client/teacher-client";
import type { Teacher } from "@/modules/teacher/types/teacher.types";
import {
  createCenterCost,
  listCenterCosts,
  toggleCenterCostActive,
} from "../client/center-cost-client";
import { CenterCostFormDialog } from "./center-cost-form-dialog";
import type {
  CenterCost,
  CenterCostCreatePayload,
  CenterCostDeductionType,
  CenterCostScopeFilter,
} from "../types/center-cost.types";

type CenterCostPageState = {
  isLoading: boolean;
  isLoadingTeachers: boolean;
  errorMessage: string | null;
  centerCosts: CenterCost[];
  teachers: Teacher[];
};

const initialState: CenterCostPageState = {
  isLoading: true,
  isLoadingTeachers: true,
  errorMessage: null,
  centerCosts: [],
  teachers: [],
};

const scopeOptions: Array<{
  value: Exclude<CenterCostScopeFilter, "ALL">;
  label: string;
}> = [
  {
    value: "GLOBAL",
    label: "Global",
  },
  {
    value: "PER_TEACHER",
    label: "Per teacher",
  },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

function extractErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

function parseScopeFilter(value: string | null): CenterCostScopeFilter {
  if (value === "GLOBAL" || value === "PER_TEACHER") {
    return value;
  }

  return "ALL";
}

function formatCurrencyValue(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCenterCostType(value: CenterCostDeductionType) {
  switch (value) {
    case "PERCENTAGE_OF_TOTAL":
      return "Percent of total";
    case "PERCENTAGE_PER_STUDENT":
      return "Percent per student";
    case "FIXED_PER_STUDENT":
      return "Fixed per student";
    default:
      return value;
  }
}

function formatCenterCostScope(centerCost: CenterCost) {
  if (centerCost.scope === "GLOBAL") {
    return "Global";
  }

  return centerCost.teacherName
    ? `Per teacher - ${centerCost.teacherName}`
    : "Per teacher";
}

function formatCenterCostValue(centerCost: CenterCost) {
  if (
    centerCost.deduction_type === "PERCENTAGE_OF_TOTAL" ||
    centerCost.deduction_type === "PERCENTAGE_PER_STUDENT"
  ) {
    return `${centerCost.value}%`;
  }

  return formatCurrencyValue(centerCost.value);
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return dateFormatter.format(date);
}

export function CenterCostListPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user, setUser, clearUser } = useAppAuth();

  const [state, setState] = useState<CenterCostPageState>(initialState);
  const [togglingCostId, setTogglingCostId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const isSessionReady = user?.role === "ADMIN";
  const scopeFilter = parseScopeFilter(searchParams.get("scope"));

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

  const loadTeachers = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoadingTeachers: true,
    }));

    try {
      const teachers = await listTeachers({
        isActive: true,
        page: 1,
        limit: 100,
      });

      setState((previous) => ({
        ...previous,
        isLoadingTeachers: false,
        teachers,
      }));
    } catch (error) {
      setState((previous) => ({
        ...previous,
        isLoadingTeachers: false,
        errorMessage:
          previous.errorMessage ??
          extractErrorMessage(error, "Unable to load teachers."),
      }));
    }
  }, []);

  const loadCenterCosts = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const centerCosts = await listCenterCosts({
        scope: scopeFilter,
        page: 1,
        limit: 100,
      });

      setState((previous) => ({
        ...previous,
        isLoading: false,
        errorMessage: null,
        centerCosts,
      }));
    } catch (error) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        errorMessage: extractErrorMessage(
          error,
          "Unable to load center costs.",
        ),
      }));
    }
  }, [scopeFilter]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void loadTeachers();
    void loadCenterCosts();
  }, [isSessionReady, loadCenterCosts, loadTeachers]);

  const summary = useMemo(() => {
    const total = state.centerCosts.length;
    const active = state.centerCosts.filter(
      (centerCost) => centerCost.is_active,
    ).length;
    const global = state.centerCosts.filter(
      (centerCost) => centerCost.scope === "GLOBAL",
    ).length;
    const perTeacher = total - global;

    return {
      total,
      active,
      inactive: total - active,
      global,
      perTeacher,
    };
  }, [state.centerCosts]);

  const handleToggleActive = useCallback(
    async (centerCost: CenterCost) => {
      setTogglingCostId(centerCost.id);

      try {
        const updatedCenterCost = await toggleCenterCostActive(centerCost.id);
        setState((previous) => ({
          ...previous,
          centerCosts: previous.centerCosts.map((item) =>
            item.id === updatedCenterCost.id ? updatedCenterCost : item,
          ),
        }));
        toast.success(
          updatedCenterCost.is_active ? "Cost activated" : "Cost deactivated",
          updatedCenterCost.is_active
            ? "The deduction rule is now active."
            : "The deduction rule has been disabled.",
        );
      } catch (error) {
        toast.error(
          "Unable to update cost status",
          extractErrorMessage(error, "Please try again."),
        );
      } finally {
        setTogglingCostId(null);
      }
    },
    [toast],
  );

  const handleCreateCenterCost = useCallback(
    async (payload: CenterCostCreatePayload) => {
      const createdCenterCost = await createCenterCost(payload);

      setState((previous) => ({
        ...previous,
        centerCosts: [createdCenterCost, ...previous.centerCosts],
      }));

      toast.success(
        "Cost rule created",
        "The deduction rule was created successfully.",
      );
    },
    [toast],
  );

  return (
    <section className="space-y-6">
      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <BadgePercent className="size-3.5" />
              Center cost rules
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              Center Costs
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Review the deduction rules applied globally or per teacher, and
              toggle whether each rule is active.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsCreateDialogOpen(true);
              }}
              disabled={state.isLoadingTeachers}
            >
              <Plus className="mr-2 size-4" />
              Create cost
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void loadCenterCosts();
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

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total rules
            </p>
            <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Active
            </p>
            <p className="mt-2 text-2xl font-semibold">{summary.active}</p>
          </div>
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Global
            </p>
            <p className="mt-2 text-2xl font-semibold">{summary.global}</p>
          </div>
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Per teacher
            </p>
            <p className="mt-2 text-2xl font-semibold">{summary.perTeacher}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Filters</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Narrow the table by scope.
            </p>
          </div>

          <FilterField label="Scope" className="w-full md:max-w-xs">
            <SelectFilter
              value={scopeFilter}
              onChange={(value) => {
                replaceQueryParams((params) => {
                  if (value && value !== "ALL") {
                    params.set("scope", value);
                  } else {
                    params.delete("scope");
                  }
                });
              }}
              options={scopeOptions}
              emptyLabel="All scopes"
              disabled={state.isLoading}
            />
          </FilterField>
        </div>
      </div>

      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <BadgePercent className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Costs table</h2>
        </div>

        {state.errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.errorMessage}
          </div>
        ) : null}

        {state.isLoading ? (
          <div className="mt-4 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            Loading center costs...
          </div>
        ) : state.centerCosts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            No center costs match the current filter.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Scope</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Active toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {state.centerCosts.map((centerCost) => {
                  const isToggling = togglingCostId === centerCost.id;

                  return (
                    <tr key={centerCost.id}>
                      <td className="px-3 py-3">
                        <div className="font-medium text-foreground">
                          {centerCost.name}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {formatCenterCostType(centerCost.deduction_type)}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {formatCenterCostScope(centerCost)}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {formatCenterCostValue(centerCost)}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {formatCreatedAt(centerCost.created_at)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              centerCost.is_active
                                ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                                : "rounded-full border border-muted-foreground/30 bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                            }
                          >
                            {centerCost.is_active ? "Active" : "Inactive"}
                          </span>
                          <Button
                            type="button"
                            variant={
                              centerCost.is_active ? "destructive" : "default"
                            }
                            size="sm"
                            disabled={togglingCostId !== null}
                            onClick={() => {
                              void handleToggleActive(centerCost);
                            }}
                          >
                            {isToggling ? (
                              <>
                                <Loader2 className="mr-2 size-3.5 animate-spin" />
                                Updating...
                              </>
                            ) : centerCost.is_active ? (
                              "Deactivate"
                            ) : (
                              "Activate"
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CenterCostFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        teachers={state.teachers}
        onCreate={handleCreateCenterCost}
      />
    </section>
  );
}
