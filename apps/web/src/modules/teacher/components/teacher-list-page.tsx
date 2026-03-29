"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppAuth } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import {
  createTeacher,
  getTeacherDetail,
  listTeachers,
  updateTeacher,
} from "../client/teacher-client";
import { TeacherFormDialog } from "./teacher-form-dialog";
import { UserDetailDialog } from "@/modules/user/components/user-detail-dialog";
import type { Teacher, TeacherDetail } from "../types/teacher.types";

type TeacherListState = {
  isLoading: boolean;
  errorMessage: string | null;
  items: Teacher[];
};

const initialTeacherListState: TeacherListState = {
  isLoading: true,
  errorMessage: null,
  items: [],
};

type TeacherStatusFilter = "all" | "active" | "inactive";

const defaultPage = 1;
const defaultLimit = 10;
const limitOptions = [10, 20, 50];
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function parsePositiveInteger(value: string | null, fallbackValue: number) {
  if (!value) {
    return fallbackValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return parsed;
}

function parseStatusFilter(value: string | null): TeacherStatusFilter {
  if (value === "active" || value === "inactive") {
    return value;
  }
  return "all";
}

function getStatusFilterValue(filter: TeacherStatusFilter): boolean | undefined {
  if (filter === "active") {
    return true;
  }

  if (filter === "inactive") {
    return false;
  }

  return undefined;
}

function getTeacherName(teacher: Teacher) {
  return `${teacher.firstName} ${teacher.lastName}`.trim();
}

function getFormattedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return dateFormatter.format(date);
}

function getFormattedDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return dateTimeFormatter.format(date);
}

function toDisplayNumber(value: number | null) {
  if (value === null) {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function TeacherListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, setUser, clearUser } = useAppAuth();

  const searchValue = searchParams.get("search")?.trim() ?? "";
  const page = parsePositiveInteger(searchParams.get("page"), defaultPage);
  const rawLimit = parsePositiveInteger(searchParams.get("limit"), defaultLimit);
  const limit = limitOptions.includes(rawLimit) ? rawLimit : defaultLimit;
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const isActiveFilter = getStatusFilterValue(statusFilter);

  const [searchInput, setSearchInput] = useState(searchValue);
  const [state, setState] = useState<TeacherListState>(initialTeacherListState);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [viewingTeacherId, setViewingTeacherId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      setIsSessionReady(true);
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
          fullName: session.profile?.centerName ?? session.auth.center.centerName,
          email: session.auth.center.email,
        });
        setIsSessionReady(true);
      } catch {
        if (isCancelled) {
          return;
        }

        clearUser();
        setIsSessionReady(false);
        router.replace("/center/login");
      }
    }

    void initializeCenterSession();

    return () => {
      isCancelled = true;
    };
  }, [clearUser, router, setUser, user?.role]);

  useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

  const replaceQueryParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      mutate(nextParams);

      const currentQuery = searchParams.toString();
      const nextQuery = nextParams.toString();
      if (nextQuery === currentQuery) {
        return;
      }

      const target = nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const normalized = searchInput.trim();
      if (normalized === searchValue) {
        return;
      }

      replaceQueryParams((params) => {
        if (normalized.length > 0) {
          params.set("search", normalized);
        } else {
          params.delete("search");
        }

        params.set("page", "1");
      });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [replaceQueryParams, searchInput, searchValue]);

  const loadTeachers = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const teachers = await listTeachers({
        search: searchValue || undefined,
        isActive: isActiveFilter,
        page,
        limit,
      });

      setState({
        isLoading: false,
        errorMessage: null,
        items: teachers,
      });
    } catch (error: unknown) {
      setState({
        isLoading: false,
        errorMessage:
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Unable to load teachers.",
        items: [],
      });
    }
  }, [isActiveFilter, limit, page, searchValue]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void loadTeachers();
  }, [isSessionReady, loadTeachers]);

  const handleCreateTeacher = useCallback(
    async (payload: Parameters<typeof createTeacher>[0]) => {
      await createTeacher(payload);
      await loadTeachers();
    },
    [loadTeachers],
  );

  const handleUpdateTeacher = useCallback(
    async (teacherId: string, payload: Parameters<typeof updateTeacher>[1]) => {
      await updateTeacher(teacherId, payload);
      await loadTeachers();
    },
    [loadTeachers],
  );

  const loadTeacherDetail = useCallback((teacherId: string) => {
    return getTeacherDetail(teacherId);
  }, []);

  const hasPreviousPage = page > 1;
  const hasNextPage = state.items.length === limit;

  const summaryLabel = useMemo(() => {
    if (state.items.length === 0) {
      return "No teachers found for this filter.";
    }

    const firstItemIndex = (page - 1) * limit + 1;
    const lastItemIndex = firstItemIndex + state.items.length - 1;
    return `Showing ${firstItemIndex}-${lastItemIndex}`;
  }, [limit, page, state.items.length]);

  if (!isSessionReady) {
    return (
      <section className="mx-auto w-full max-w-6xl">
        <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
          <p className="text-sm text-muted-foreground">Validating center session...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Teachers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage and review teachers for your current center.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Users className="size-4" />
              {summaryLabel}
            </div>
            <Button
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Add Teacher
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_140px]">
          <label className="relative block">
            <span className="sr-only">Search teachers</span>
            <Search className="pointer-events-none absolute top-4 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, email, or CIN"
              value={searchInput}
              onChange={(event) => {
                const nextValue = event.currentTarget.value;
                setSearchInput(nextValue);
              }}
              className="pl-9"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                const value = event.currentTarget.value;
                replaceQueryParams((params) => {
                  if (value === "all") {
                    params.delete("status");
                  } else {
                    params.set("status", value);
                  }

                  params.set("page", "1");
                });
              }}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="all">All teachers</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Per page</span>
            <select
              value={String(limit)}
              onChange={(event) => {
                const value = Number.parseInt(event.currentTarget.value, 10);
                replaceQueryParams((params) => {
                  params.set("limit", String(value));
                  params.set("page", "1");
                });
              }}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {limitOptions.map((option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option} rows
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card/90 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-left text-sm">
            <caption className="sr-only">Teachers list with search and filters</caption>
            <thead className="bg-muted/55 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Phone
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  CIN
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Created
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right font-medium"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {state.isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading teachers...
                  </td>
                </tr>
              ) : state.errorMessage ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-destructive"
                  >
                    {state.errorMessage}
                  </td>
                </tr>
              ) : state.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No teachers found.
                  </td>
                </tr>
              ) : (
                state.items.map((teacher) => (
                  <tr
                    key={teacher.id}
                    className="border-t"
                  >
                    <td className="px-4 py-3 font-medium">{getTeacherName(teacher)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{teacher.email}</td>
                    <td className="px-4 py-3">{teacher.phone}</td>
                    <td className="px-4 py-3">{teacher.cin ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          teacher.isActive
                            ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                            : "rounded-full border border-muted-foreground/30 bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        }
                      >
                        {teacher.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getFormattedDate(teacher.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewingTeacherId(teacher.id);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTeacher(teacher);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">Page {page}</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={state.isLoading || !hasPreviousPage}
              onClick={() => {
                replaceQueryParams((params) => {
                  params.set("page", String(page - 1));
                });
              }}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={state.isLoading || !hasNextPage}
              onClick={() => {
                replaceQueryParams((params) => {
                  params.set("page", String(page + 1));
                });
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <TeacherFormDialog
        mode="create"
        teacher={null}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreate={handleCreateTeacher}
        onUpdate={handleUpdateTeacher}
      />

      <TeacherFormDialog
        mode="edit"
        teacher={editingTeacher}
        open={editingTeacher !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingTeacher(null);
          }
        }}
        onCreate={handleCreateTeacher}
        onUpdate={handleUpdateTeacher}
      />

      <UserDetailDialog<TeacherDetail>
        open={viewingTeacherId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setViewingTeacherId(null);
          }
        }}
        userId={viewingTeacherId}
        entityLabel="Teacher"
        loadDetail={loadTeacherDetail}
        getTitle={(teacher) => `${teacher.firstName} ${teacher.lastName}`.trim()}
        getSubtitle={(teacher) => teacher.email}
        getIsActive={(teacher) => teacher.isActive}
        renderDetail={(teacher) => (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd className="font-medium">{teacher.phone}</dd>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">CIN</dt>
              <dd className="font-medium">{teacher.cin ?? "-"}</dd>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Hourly Rate</dt>
              <dd className="font-medium">{toDisplayNumber(teacher.hourlyRate)}</dd>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Max Hours / Week</dt>
              <dd className="font-medium">
                {toDisplayNumber(teacher.maxHoursPerWeek)}
              </dd>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Hours This Week</dt>
              <dd className="font-medium">{toDisplayNumber(teacher.hoursThisWeek)}</dd>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Hours This Month</dt>
              <dd className="font-medium">{toDisplayNumber(teacher.hoursThisMonth)}</dd>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2 sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Subjects</dt>
              <dd className="font-medium">
                {teacher.subjects.length > 0
                  ? teacher.subjects.map((subject) => subject.name).join(", ")
                  : "No subjects assigned"}
              </dd>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2 sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Created At</dt>
              <dd className="font-medium">{getFormattedDateTime(teacher.createdAt)}</dd>
            </div>
          </dl>
        )}
      />
    </section>
  );
}
