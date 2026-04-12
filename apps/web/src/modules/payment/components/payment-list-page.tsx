"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BanknoteArrowDown, ExternalLink, Loader2, ReceiptText } from "lucide-react";

import { FilterField } from "@/components/filters/filter-field";
import { SearchFilterInput } from "@/components/filters/search-filter-input";
import { SelectFilter } from "@/components/filters/select-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppAuth, useToast } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import { listStudents } from "@/modules/student/client/student-client";
import type { Student } from "@/modules/student/types/student.types";
import { listStudentGroups } from "@/modules/student-group/client/student-group-client";
import type { StudentGroup } from "@/modules/student-group/types/student-group.types";
import {
  createPayment,
  listPayments,
  openPaymentReceipt,
} from "../client/payment-client";
import { PaymentRecordFormDialog } from "./payment-record-form-dialog";
import {
  getPaymentStatusLabel,
  PaymentStatusBadge,
} from "./payment-status-badge";
import type { Payment } from "../types/payment.types";

type PaymentPageState = {
  isLoadingPayments: boolean;
  isLoadingOptions: boolean;
  errorMessage: string | null;
  payments: Payment[];
  studentGroups: StudentGroup[];
  students: Student[];
};

const initialState: PaymentPageState = {
  isLoadingPayments: true,
  isLoadingOptions: true,
  errorMessage: null,
  payments: [],
  studentGroups: [],
  students: [],
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "MAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const paymentStatusOptions: Array<{ value: Payment["status"]; label: string }> = [
  { value: "PAID", label: getPaymentStatusLabel("PAID") },
  { value: "PARTIALLY_PAID", label: getPaymentStatusLabel("PARTIALLY_PAID") },
  { value: "UNPAID", label: getPaymentStatusLabel("UNPAID") },
];

function extractErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return dateTimeFormatter.format(date);
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function getStudentName(student: Student) {
  return `${student.firstName} ${student.lastName}`.trim();
}

function parseStatusFilter(value: string | null): Payment["status"] | "" {
  if (
    value === "PAID" ||
    value === "PARTIALLY_PAID" ||
    value === "UNPAID"
  ) {
    return value;
  }

  return "";
}

export function PaymentListPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user, setUser, clearUser } = useAppAuth();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [openingReceiptId, setOpeningReceiptId] = useState<string | null>(null);
  const [state, setState] = useState<PaymentPageState>(initialState);

  const searchValue = searchParams.get("search")?.trim() ?? "";
  const studentFilter = searchParams.get("student")?.trim() ?? "";
  const groupFilter = searchParams.get("group")?.trim() ?? "";
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const paymentFromFilter = searchParams.get("from")?.trim() ?? "";
  const paymentToFilter = searchParams.get("to")?.trim() ?? "";

  const [searchInput, setSearchInput] = useState(searchValue);
  const isSessionReady = user?.role === "ADMIN";
  const hasInvalidDateRange =
    paymentFromFilter.length > 0 &&
    paymentToFilter.length > 0 &&
    paymentFromFilter > paymentToFilter;

  useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

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
          fullName: session.profile?.centerName ?? session.auth.center.centerName,
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
      });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [replaceQueryParams, searchInput, searchValue]);

  const loadOptions = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoadingOptions: true,
      errorMessage: previous.errorMessage,
    }));

    try {
      const [studentGroups, students] = await Promise.all([
        listStudentGroups({
          page: 1,
          limit: 100,
        }),
        listStudents({
          isActive: true,
          page: 1,
          limit: 100,
        }),
      ]);

      setState((previous) => ({
        ...previous,
        isLoadingOptions: false,
        studentGroups,
        students,
      }));
    } catch (error: unknown) {
      setState((previous) => ({
        ...previous,
        isLoadingOptions: false,
        errorMessage: extractErrorMessage(error, "Unable to load payment filters."),
      }));
    }
  }, []);

  const loadPayments = useCallback(async () => {
    if (hasInvalidDateRange) {
      setState((previous) => ({
        ...previous,
        isLoadingPayments: false,
        errorMessage: "The start date must be earlier than or equal to the end date.",
        payments: [],
      }));
      return;
    }

    setState((previous) => ({
      ...previous,
      isLoadingPayments: true,
      errorMessage: null,
    }));

    try {
      const payments = await listPayments({
        student_id: studentFilter || undefined,
        student_group_id: groupFilter || undefined,
        status: statusFilter || undefined,
        payment_from: paymentFromFilter || undefined,
        payment_to: paymentToFilter || undefined,
        page: 1,
        limit: 100,
      });

      setState((previous) => ({
        ...previous,
        isLoadingPayments: false,
        errorMessage: null,
        payments,
      }));
    } catch (error: unknown) {
      setState((previous) => ({
        ...previous,
        isLoadingPayments: false,
        errorMessage: extractErrorMessage(error, "Unable to load payments."),
        payments: [],
      }));
    }
  }, [
    groupFilter,
    hasInvalidDateRange,
    paymentFromFilter,
    paymentToFilter,
    statusFilter,
    studentFilter,
  ]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void (async () => {
      await loadOptions();
    })();
  }, [isSessionReady, loadOptions]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void (async () => {
      await loadPayments();
    })();
  }, [isSessionReady, loadPayments]);

  const handleCreatePayment = useCallback(
    async (payload: Parameters<typeof createPayment>[0]) => {
      try {
        await createPayment(payload);
        await loadPayments();
        toast.success("Payment recorded", "The payment was saved successfully.");
      } catch (error: unknown) {
        toast.error(
          "Unable to record payment",
          extractErrorMessage(error, "Please review the form values and try again."),
        );
        throw error;
      }
    },
    [loadPayments, toast],
  );

  const handleOpenReceipt = useCallback(
    async (paymentId: string) => {
      if (openingReceiptId) {
        return;
      }

      setOpeningReceiptId(paymentId);
      try {
        await openPaymentReceipt(paymentId);
      } catch (error: unknown) {
        toast.error(
          "Unable to open receipt",
          extractErrorMessage(error, "Please try again in a moment."),
        );
      } finally {
        setOpeningReceiptId(null);
      }
    },
    [openingReceiptId, toast],
  );

  const studentOptions = useMemo(
    () =>
      [...state.students]
        .map((student) => ({
          value: student.id,
          label: getStudentName(student),
        }))
        .sort((left, right) =>
          left.label.localeCompare(right.label, undefined, {
            sensitivity: "base",
          }),
        ),
    [state.students],
  );

  const groupOptions = useMemo(
    () =>
      [...state.studentGroups]
        .map((group) => ({
          value: group.id,
          label: group.name,
        }))
        .sort((left, right) =>
          left.label.localeCompare(right.label, undefined, {
            sensitivity: "base",
          }),
        ),
    [state.studentGroups],
  );

  const filteredPayments = useMemo(() => {
    const normalizedSearch = searchValue.toLowerCase();
    if (!normalizedSearch) {
      return state.payments;
    }

    return state.payments.filter((payment) => {
      const haystack = [
        payment.studentName,
        payment.studentGroupName ?? "",
        payment.teacherName,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [searchValue, state.payments]);

  const totalCollected = useMemo(
    () => filteredPayments.reduce((sum, payment) => sum + payment.paidAmount, 0),
    [filteredPayments],
  );

  const totalOutstanding = useMemo(
    () => filteredPayments.reduce((sum, payment) => sum + payment.rest, 0),
    [filteredPayments],
  );

  const hasActiveFilters =
    searchValue.length > 0 ||
    studentFilter.length > 0 ||
    groupFilter.length > 0 ||
    statusFilter.length > 0 ||
    paymentFromFilter.length > 0 ||
    paymentToFilter.length > 0;

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
    <section className="mx-auto w-full max-w-full space-y-4">
      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Payments</h1>
            <p className="text-sm text-muted-foreground">
              Search and filter payment records by student, group, status, and date.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={state.studentGroups.length === 0 || state.isLoadingOptions}
          >
            <BanknoteArrowDown className="mr-2 size-4" />
            Record payment
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Visible records
            </p>
            <p className="mt-2 text-2xl font-semibold">{filteredPayments.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              After search and active filters
            </p>
          </div>

          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Collected
            </p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalCollected)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sum of visible paid amounts
            </p>
          </div>

          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Outstanding
            </p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalOutstanding)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Remaining balance in visible records
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Filters</h2>
            <p className="text-sm text-muted-foreground">
              Refine the table using filters and local text search.
            </p>
          </div>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchInput("");
                router.replace(pathname, { scroll: false });
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <SearchFilterInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search by student, group, or teacher"
              disabled={state.isLoadingPayments}
            />
          </div>

          <FilterField label="Student">
            <SelectFilter
              value={studentFilter}
              onChange={(value) => {
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("student", value);
                  } else {
                    params.delete("student");
                  }
                });
              }}
              options={studentOptions}
              emptyLabel="All students"
              disabled={state.isLoadingOptions}
            />
          </FilterField>

          <FilterField label="Group">
            <SelectFilter
              value={groupFilter}
              onChange={(value) => {
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("group", value);
                  } else {
                    params.delete("group");
                  }
                });
              }}
              options={groupOptions}
              emptyLabel="All groups"
              disabled={state.isLoadingOptions}
            />
          </FilterField>

          <FilterField label="Status">
            <SelectFilter
              value={statusFilter}
              onChange={(value) => {
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("status", value);
                  } else {
                    params.delete("status");
                  }
                });
              }}
              options={paymentStatusOptions}
              emptyLabel="All statuses"
              disabled={state.isLoadingPayments}
            />
          </FilterField>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:max-w-xl">
          <FilterField label="From date">
            <Input
              type="date"
              value={paymentFromFilter}
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
              disabled={state.isLoadingPayments}
            />
          </FilterField>

          <FilterField label="To date">
            <Input
              type="date"
              value={paymentToFilter}
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
              disabled={state.isLoadingPayments}
            />
          </FilterField>
        </div>
      </div>

      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Payments table</h2>
        </div>

        {state.errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.errorMessage}
          </div>
        ) : null}

        {state.isLoadingPayments ? (
          <div className="mt-4 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            Loading payments...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            No payments match the current search and filters.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Group</th>
                  <th className="px-3 py-2 font-medium">Teacher</th>
                  <th className="px-3 py-2 font-medium">Collected</th>
                  <th className="px-3 py-2 font-medium">Expected</th>
                  <th className="px-3 py-2 font-medium">Remaining</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground">{payment.studentName}</div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {payment.studentGroupName ?? "Private payment"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {payment.teacherName}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {formatCurrency(payment.paidAmount)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatCurrency(payment.rest)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatDateTime(payment.paymentDate)}
                    </td>
                    <td className="px-3 py-3">
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                    <td className="px-3 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void handleOpenReceipt(payment.id);
                        }}
                        disabled={openingReceiptId !== null}
                      >
                        {openingReceiptId === payment.id ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Opening...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="mr-2 size-4" />
                            Receipt
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PaymentRecordFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        studentGroups={state.studentGroups}
        onCreate={handleCreatePayment}
      />
    </section>
  );
}
