"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppAuth } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import {
  createStudent,
  getStudentDetail,
  listStudents,
  updateStudent,
} from "../client/student-client";
import { StudentFormDialog } from "./student-form-dialog";
import { UserDetailDialog } from "@/modules/user/components/user-detail-dialog";
import type {
  SchoolCycle,
  SchoolYear,
  Student,
  StudentDetail,
} from "../types/student.types";

type StudentListState = {
  isLoading: boolean;
  errorMessage: string | null;
  items: Student[];
};

const initialStudentListState: StudentListState = {
  isLoading: true,
  errorMessage: null,
  items: [],
};

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
const decimalFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const schoolYearLabels: Record<SchoolYear, string> = {
  FIRST_YEAR: "1st Year",
  SECOND_YEAR: "2nd Year",
  THIRD_YEAR: "3rd Year",
  FOURTH_YEAR: "4th Year",
  FIFTH_YEAR: "5th Year",
  SIXTH_YEAR: "6th Year",
};

const schoolYearOptions = Object.entries(schoolYearLabels) as Array<
  [SchoolYear, string]
>;

const schoolCycleLabels: Record<SchoolCycle, string> = {
  PRIMARY: "Primary",
  COLLEGE: "College",
  LYCEE: "Lycee",
};

const schoolCycleOptions = Object.entries(schoolCycleLabels) as Array<
  [SchoolCycle, string]
>;

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

function parseSchoolYearFilter(value: string | null): SchoolYear | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return schoolYearOptions.find(([schoolYear]) => schoolYear === normalized)?.[0];
}

function parseSchoolCycleFilter(value: string | null): SchoolCycle | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return schoolCycleOptions.find(([schoolCycle]) => schoolCycle === normalized)?.[0];
}

function getStudentName(student: Student) {
  return `${student.firstName} ${student.lastName}`.trim();
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

function getStudentLevel(student: Student) {
  if (!student.schoolYear && !student.schoolCycle) {
    return "-";
  }

  const yearLabel = student.schoolYear ? schoolYearLabels[student.schoolYear] : "N/A";
  const cycleLabel = student.schoolCycle ? schoolCycleLabels[student.schoolCycle] : "N/A";
  return `${cycleLabel} / ${yearLabel}`;
}

function getStudentDetailLevel(student: StudentDetail) {
  if (!student.schoolYear && !student.schoolCycle) {
    return "-";
  }

  const yearLabel = student.schoolYear ? schoolYearLabels[student.schoolYear] : "N/A";
  const cycleLabel = student.schoolCycle
    ? schoolCycleLabels[student.schoolCycle]
    : "N/A";
  return `${cycleLabel} / ${yearLabel}`;
}

function getPaymentStatusLabel(status: StudentDetail["payments"][number]["status"]) {
  if (status === "PAID") {
    return "Paid";
  }
  if (status === "PARTIALLY_PAID") {
    return "Partially paid";
  }
  return "Unpaid";
}

function formatNumber(value: number) {
  return decimalFormatter.format(value);
}

export function StudentListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, setUser, clearUser } = useAppAuth();

  const searchValue = searchParams.get("search")?.trim() ?? "";
  const page = parsePositiveInteger(searchParams.get("page"), defaultPage);
  const rawLimit = parsePositiveInteger(searchParams.get("limit"), defaultLimit);
  const limit = limitOptions.includes(rawLimit) ? rawLimit : defaultLimit;
  const cycleFilter = parseSchoolCycleFilter(searchParams.get("cycle"));
  const levelFilter = parseSchoolYearFilter(searchParams.get("level"));

  const [searchInput, setSearchInput] = useState(searchValue);
  const [state, setState] = useState<StudentListState>(initialStudentListState);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

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

  const loadStudents = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const students = await listStudents({
        search: searchValue || undefined,
        schoolCycle: cycleFilter,
        schoolYear: levelFilter,
        page,
        limit,
      });

      setState({
        isLoading: false,
        errorMessage: null,
        items: students,
      });
    } catch (error: unknown) {
      setState({
        isLoading: false,
        errorMessage:
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Unable to load students.",
        items: [],
      });
    }
  }, [cycleFilter, levelFilter, limit, page, searchValue]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void loadStudents();
  }, [isSessionReady, loadStudents]);

  const handleCreateStudent = useCallback(
    async (payload: Parameters<typeof createStudent>[0]) => {
      await createStudent(payload);
      await loadStudents();
    },
    [loadStudents],
  );

  const handleUpdateStudent = useCallback(
    async (studentId: string, payload: Parameters<typeof updateStudent>[1]) => {
      await updateStudent(studentId, payload);
      await loadStudents();
    },
    [loadStudents],
  );

  const loadStudentDetail = useCallback((studentId: string) => {
    return getStudentDetail(studentId);
  }, []);

  const hasPreviousPage = page > 1;
  const hasNextPage = state.items.length === limit;

  const summaryLabel = useMemo(() => {
    if (state.items.length === 0) {
      return "No students found for this filter.";
    }

    const firstItemIndex = (page - 1) * limit + 1;
    const lastItemIndex = firstItemIndex + state.items.length - 1;
    return `Showing ${firstItemIndex}-${lastItemIndex}`;
  }, [limit, page, state.items.length]);

  if (!isSessionReady) {
    return (
      <section className="mx-auto w-full max-w-7xl">
        <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
          <p className="text-sm text-muted-foreground">Validating center session...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4">
      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Students</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search and filter students by school cycle and level for your current center.
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
              Add Student
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px_140px]">
          <label className="relative block">
            <span className="sr-only">Search students</span>
            <Search className="pointer-events-none absolute top-4 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, email, phone, parent phone"
              value={searchInput}
              onChange={(event) => {
                const nextValue = event.currentTarget.value;
                setSearchInput(nextValue);
              }}
              className="pl-9"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">School cycle</span>
            <select
              value={cycleFilter ?? ""}
              onChange={(event) => {
                const value = event.currentTarget.value;
                replaceQueryParams((params) => {
                  if (!value) {
                    params.delete("cycle");
                  } else {
                    params.set("cycle", value);
                  }

                  params.set("page", "1");
                });
              }}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">All cycles</option>
              {schoolCycleOptions.map(([schoolCycle, label]) => (
                <option
                  key={schoolCycle}
                  value={schoolCycle}
                >
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Level</span>
            <select
              value={levelFilter ?? ""}
              onChange={(event) => {
                const value = event.currentTarget.value;
                replaceQueryParams((params) => {
                  if (!value) {
                    params.delete("level");
                  } else {
                    params.set("level", value);
                  }

                  params.set("page", "1");
                });
              }}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">All levels</option>
              {schoolYearOptions.map(([schoolYear, label]) => (
                <option
                  key={schoolYear}
                  value={schoolYear}
                >
                  {label}
                </option>
              ))}
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
          <table className="w-full min-w-315 text-left text-sm">
            <caption className="sr-only">
              Students list with search, school cycle filter, and level filter
            </caption>
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
                  Parent Phone
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  School
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Level
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
                    colSpan={9}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading students...
                  </td>
                </tr>
              ) : state.errorMessage ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-sm text-destructive"
                  >
                    {state.errorMessage}
                  </td>
                </tr>
              ) : state.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No students found.
                  </td>
                </tr>
              ) : (
                state.items.map((student) => (
                  <tr
                    key={student.id}
                    className="border-t"
                  >
                    <td className="px-4 py-3 font-medium">{getStudentName(student)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{student.email}</td>
                    <td className="px-4 py-3">{student.phone}</td>
                    <td className="px-4 py-3">{student.parentPhone ?? "-"}</td>
                    <td className="px-4 py-3">{student.schoolName ?? "-"}</td>
                    <td className="px-4 py-3">{getStudentLevel(student)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          student.isActive
                            ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                            : "rounded-full border border-muted-foreground/30 bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        }
                      >
                        {student.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getFormattedDate(student.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewingStudentId(student.id);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingStudent(student);
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

      <StudentFormDialog
        mode="create"
        student={null}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreate={handleCreateStudent}
        onUpdate={handleUpdateStudent}
      />

      <StudentFormDialog
        mode="edit"
        student={editingStudent}
        open={editingStudent !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingStudent(null);
          }
        }}
        onCreate={handleCreateStudent}
        onUpdate={handleUpdateStudent}
      />

      <UserDetailDialog<StudentDetail>
        open={viewingStudentId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setViewingStudentId(null);
          }
        }}
        userId={viewingStudentId}
        entityLabel="Student"
        loadDetail={loadStudentDetail}
        getTitle={(student) => `${student.firstName} ${student.lastName}`.trim()}
        getSubtitle={(student) => student.email}
        getIsActive={(student) => student.isActive}
        renderDetail={(student) => (
          <div className="space-y-3">
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-md border bg-background/60 px-3 py-2">
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="font-medium">{student.phone}</dd>
              </div>
              <div className="rounded-md border bg-background/60 px-3 py-2">
                <dt className="text-xs text-muted-foreground">Parent Phone</dt>
                <dd className="font-medium">{student.parentPhone ?? "-"}</dd>
              </div>
              <div className="rounded-md border bg-background/60 px-3 py-2">
                <dt className="text-xs text-muted-foreground">School</dt>
                <dd className="font-medium">{student.schoolName ?? "-"}</dd>
              </div>
              <div className="rounded-md border bg-background/60 px-3 py-2">
                <dt className="text-xs text-muted-foreground">Level</dt>
                <dd className="font-medium">{getStudentDetailLevel(student)}</dd>
              </div>
              <div className="rounded-md border bg-background/60 px-3 py-2 sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Created At</dt>
                <dd className="font-medium">{getFormattedDateTime(student.createdAt)}</dd>
              </div>
            </dl>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-md border bg-background/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Payments</p>
                <p className="font-semibold">{student.paymentSummary.totalPayments}</p>
              </div>
              <div className="rounded-md border bg-background/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="font-semibold">{formatNumber(student.paymentSummary.totalAmount)}</p>
              </div>
              <div className="rounded-md border bg-background/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="font-semibold">{formatNumber(student.paymentSummary.totalPaid)}</p>
              </div>
              <div className="rounded-md border bg-background/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="font-semibold">
                  {formatNumber(student.paymentSummary.outstandingBalance)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Enrollments</p>
              {student.enrollments.length > 0 ? (
                <div className="space-y-1.5">
                  {student.enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="rounded-md border bg-background/60 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{enrollment.groupName}</p>
                      <p className="text-xs text-muted-foreground">
                        {schoolCycleLabels[enrollment.schoolCycle]} /{" "}
                        {schoolYearLabels[enrollment.schoolYear]} •{" "}
                        {getFormattedDate(enrollment.enrollmentDate)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                  No enrollments found.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Recent Payments</p>
              {student.payments.length > 0 ? (
                <div className="space-y-1.5">
                  {student.payments.slice(0, 5).map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-md border bg-background/60 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{formatNumber(payment.amount)}</p>
                        <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
                          {getPaymentStatusLabel(payment.status)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {payment.teacherName} • {getFormattedDate(payment.paymentDate)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                  No payments found.
                </p>
              )}
            </div>
          </div>
        )}
      />
    </section>
  );
}
