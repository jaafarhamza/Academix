"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Loader2, ReceiptText } from "lucide-react";

import { FilterField } from "@/components/filters/filter-field";
import { SearchFilterInput } from "@/components/filters/search-filter-input";
import { SelectFilter } from "@/components/filters/select-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppAuth, useToast } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import { openPaymentReceipt } from "@/modules/payment/client/payment-client";
import {
  getPaymentStatusLabel,
  PaymentStatusBadge,
} from "@/modules/payment/components/payment-status-badge";
import { getStudentPaymentHistory } from "../client/student-client";
import type { StudentPaymentHistory } from "../types/student.types";

type StudentPaymentHistoryPageProps = {
  studentId: string;
};

type StudentPaymentStatus = StudentPaymentHistory["payments"][number]["status"];

type StudentPaymentHistoryState = {
  isLoading: boolean;
  errorMessage: string | null;
  student: StudentPaymentHistory | null;
};

const initialState: StudentPaymentHistoryState = {
  isLoading: true,
  errorMessage: null,
  student: null,
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

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

const paymentStatusOptions: Array<{
  value: StudentPaymentStatus;
  label: string;
}> = [
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

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return dateFormatter.format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return dateTimeFormatter.format(date);
}

function parseStatusFilter(value: string | null): StudentPaymentStatus | "" {
  if (
    value === "PAID" ||
    value === "PARTIALLY_PAID" ||
    value === "UNPAID"
  ) {
    return value;
  }

  return "";
}

export function StudentPaymentHistoryPage({
  studentId,
}: StudentPaymentHistoryPageProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user, setUser, clearUser } = useAppAuth();

  const [state, setState] = useState<StudentPaymentHistoryState>(initialState);
  const [openingReceiptId, setOpeningReceiptId] = useState<string | null>(null);

  const searchValue = searchParams.get("search")?.trim() ?? "";
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const paymentFromFilter = searchParams.get("from")?.trim() ?? "";
  const paymentToFilter = searchParams.get("to")?.trim() ?? "";
  const [searchInput, setSearchInput] = useState(searchValue);
  const isSessionReady = user?.role === "ADMIN";

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

  const loadStudent = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const student = await getStudentPaymentHistory(studentId);
      setState({
        isLoading: false,
        errorMessage: null,
        student,
      });
    } catch (error: unknown) {
      setState({
        isLoading: false,
        errorMessage: extractErrorMessage(
          error,
          "Unable to load student payment history.",
        ),
        student: null,
      });
    }
  }, [studentId]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void loadStudent();
  }, [isSessionReady, loadStudent]);

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

  const filteredPayments = useMemo(() => {
    const payments = state.student?.payments ?? [];
    const normalizedSearch = searchValue.toLowerCase();

    return payments.filter((payment) => {
      if (statusFilter && payment.status !== statusFilter) {
        return false;
      }

      const paymentDate = payment.paymentDate.slice(0, 10);
      if (paymentFromFilter && paymentDate < paymentFromFilter) {
        return false;
      }

      if (paymentToFilter && paymentDate > paymentToFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        payment.teacherName,
        payment.studentGroupName ?? "",
        payment.status,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [
    paymentFromFilter,
    paymentToFilter,
    searchValue,
    state.student?.payments,
    statusFilter,
  ]);

  const visibleCollected = useMemo(
    () => filteredPayments.reduce((sum, payment) => sum + payment.paidAmount, 0),
    [filteredPayments],
  );

  const visibleOutstanding = useMemo(
    () => filteredPayments.reduce((sum, payment) => sum + payment.rest, 0),
    [filteredPayments],
  );

  const hasActiveFilters =
    searchValue.length > 0 ||
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Student Payment History
            </h1>
            <p className="text-sm text-muted-foreground">
              Review every payment recorded for this student, including receipts and balances.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              router.push("/center/students");
            }}
          >
            Back to students
          </Button>
        </div>

        {state.student ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Student
              </p>
              <p className="mt-2 text-lg font-semibold">
                {state.student.firstName} {state.student.lastName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {state.student.email} • {state.student.phone}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {state.student.schoolName ?? "No school"} • Created{" "}
                {formatDate(state.student.createdAt)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Total payments
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {state.student.paymentSummary.totalPayments}
                </p>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Visible collected
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatCurrency(visibleCollected)}
                </p>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Visible outstanding
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatCurrency(visibleOutstanding)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Filters</h2>
            <p className="text-sm text-muted-foreground">
              Search this student’s payment history by teacher, group, status, and date.
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

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <SearchFilterInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search by teacher, group, or status"
              disabled={state.isLoading}
            />
          </div>

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
              disabled={state.isLoading}
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
              disabled={state.isLoading}
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
              disabled={state.isLoading}
            />
          </FilterField>
        </div>
      </div>

      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Payment history</h2>
        </div>

        {state.errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.errorMessage}
          </div>
        ) : null}

        {state.isLoading ? (
          <div className="mt-4 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            Loading student payment history...
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
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Teacher</th>
                  <th className="px-3 py-2 font-medium">Group</th>
                  <th className="px-3 py-2 font-medium">Collected</th>
                  <th className="px-3 py-2 font-medium">Expected</th>
                  <th className="px-3 py-2 font-medium">Remaining</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatDateTime(payment.paymentDate)}
                    </td>
                    <td className="px-3 py-3">{payment.teacherName}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {payment.studentGroupName ?? "Private payment"}
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
    </section>
  );
}
