"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, ReceiptText } from "lucide-react";

import { FilterField } from "@/components/filters/filter-field";
import { SearchFilterInput } from "@/components/filters/search-filter-input";
import { SelectFilter } from "@/components/filters/select-filter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks";
import {
  listPayments,
  openPaymentReceipt,
} from "@/modules/payment/client/payment-client";
import {
  getPaymentStatusLabel,
  PaymentStatusBadge,
} from "@/modules/payment/components/payment-status-badge";
import type { Payment, PaymentStatus } from "@/modules/payment/types/payment.types";
import type { Student } from "@/modules/student/types/student.types";

type StudentGroupPaymentOverviewProps = {
  groupId: string;
  groupName: string;
  students: Student[];
  isGroupLoading: boolean;
};

type StudentGroupPaymentOverviewState = {
  isLoading: boolean;
  errorMessage: string | null;
  payments: Payment[];
};

type GroupPaymentOverviewRow = {
  student: Student;
  latestPayment: Payment | null;
  latestStatus: PaymentStatus;
  paymentCount: number;
};

const initialState: StudentGroupPaymentOverviewState = {
  isLoading: true,
  errorMessage: null,
  payments: [],
};
const paymentPageSize = 100;

const paymentStatusOptions: Array<{ value: PaymentStatus; label: string }> = [
  { value: "PAID", label: getPaymentStatusLabel("PAID") },
  { value: "PARTIALLY_PAID", label: getPaymentStatusLabel("PARTIALLY_PAID") },
  { value: "UNPAID", label: getPaymentStatusLabel("UNPAID") },
];

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "MAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
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

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return dateTimeFormatter.format(date);
}

function getStudentName(student: Student) {
  return `${student.firstName} ${student.lastName}`.trim();
}

function pickLatestPayment(payments: Payment[]): Payment | null {
  if (payments.length === 0) {
    return null;
  }

  return payments.reduce<Payment | null>((latestPayment, payment) => {
    if (!latestPayment) {
      return payment;
    }

    return new Date(payment.paymentDate).getTime() >
      new Date(latestPayment.paymentDate).getTime()
      ? payment
      : latestPayment;
  }, null);
}

export function StudentGroupPaymentOverview({
  groupId,
  groupName,
  students,
  isGroupLoading,
}: StudentGroupPaymentOverviewProps) {
  const router = useRouter();
  const toast = useToast();

  const [state, setState] = useState<StudentGroupPaymentOverviewState>(initialState);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");
  const [openingReceiptId, setOpeningReceiptId] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const payments: Payment[] = [];
      let page = 1;

      while (true) {
        const batch = await listPayments({
          student_group_id: groupId,
          page,
          limit: paymentPageSize,
        });

        payments.push(...batch);

        if (batch.length < paymentPageSize) {
          break;
        }

        page += 1;
      }

      setState({
        isLoading: false,
        errorMessage: null,
        payments,
      });
    } catch (error: unknown) {
      setState({
        isLoading: false,
        errorMessage: extractErrorMessage(
          error,
          "Unable to load group payment overview.",
        ),
        payments: [],
      });
    }
  }, [groupId]);

  useEffect(() => {
    if (isGroupLoading) {
      return;
    }

    void loadPayments();
  }, [isGroupLoading, loadPayments]);

  const rows = useMemo(() => {
    const paymentsByStudentId = new Map<string, Payment[]>();

    for (const payment of state.payments) {
      const currentPayments = paymentsByStudentId.get(payment.student_id) ?? [];
      currentPayments.push(payment);
      paymentsByStudentId.set(payment.student_id, currentPayments);
    }

    return students.map<GroupPaymentOverviewRow>((student) => {
      const studentPayments = paymentsByStudentId.get(student.id) ?? [];
      const latestPayment = pickLatestPayment(studentPayments);

      return {
        student,
        latestPayment,
        latestStatus: latestPayment?.status ?? "UNPAID",
        paymentCount: studentPayments.length,
      };
    });
  }, [state.payments, students]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return rows.filter((row) => {
      if (statusFilter && row.latestStatus !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        getStudentName(row.student),
        row.student.email,
        row.student.phone,
        row.student.schoolName ?? "",
        row.latestPayment?.teacherName ?? "",
        row.latestStatus,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [rows, searchValue, statusFilter]);

  const paidCount = useMemo(
    () => rows.filter((row) => row.latestStatus === "PAID").length,
    [rows],
  );
  const partialCount = useMemo(
    () => rows.filter((row) => row.latestStatus === "PARTIALLY_PAID").length,
    [rows],
  );
  const unpaidCount = useMemo(
    () => rows.filter((row) => row.latestStatus === "UNPAID").length,
    [rows],
  );

  const handleOpenReceipt = useCallback(async (paymentId: string) => {
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
  }, [openingReceiptId, toast]);

  const hasActiveFilters = searchValue.length > 0 || statusFilter.length > 0;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ReceiptText className="size-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Group payment overview</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Review the current payment status for every student in {groupName}.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              router.push(`/center/payments?group=${encodeURIComponent(groupId)}`);
            }}
          >
            Open payments list
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Students
            </p>
            <p className="mt-2 text-2xl font-semibold">{rows.length}</p>
          </div>
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Paid
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-300">
              {paidCount}
            </p>
          </div>
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Partial
            </p>
            <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-300">
              {partialCount}
            </p>
          </div>
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Unpaid
            </p>
            <p className="mt-2 text-2xl font-semibold text-rose-600 dark:text-rose-300">
              {unpaidCount}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Filters</h3>
            <p className="text-sm text-muted-foreground">
              Search students in this group and narrow the overview by status.
            </p>
          </div>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchValue("");
                setStatusFilter("");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <SearchFilterInput
              value={searchValue}
              onChange={setSearchValue}
              placeholder="Search by student, email, phone, school, or teacher"
              disabled={state.isLoading || isGroupLoading}
            />
          </div>

          <FilterField label="Status">
            <SelectFilter
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter((value as PaymentStatus) || "");
              }}
              options={paymentStatusOptions}
              emptyLabel="All statuses"
              disabled={state.isLoading || isGroupLoading}
            />
          </FilterField>
        </div>
      </div>

      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        {state.errorMessage ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.errorMessage}
          </div>
        ) : null}

        {isGroupLoading || state.isLoading ? (
          <div className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            Loading group payment overview...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            No students match the current group payment filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">School</th>
                  <th className="px-3 py-2 font-medium">Latest payment</th>
                  <th className="px-3 py-2 font-medium">Collected</th>
                  <th className="px-3 py-2 font-medium">Expected</th>
                  <th className="px-3 py-2 font-medium">Remaining</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Records</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredRows.map((row) => (
                  <tr key={row.student.id}>
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground">
                        {getStudentName(row.student)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.student.email}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {row.student.schoolName ?? "No school"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {row.latestPayment ? formatDateTime(row.latestPayment.paymentDate) : "No payment yet"}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {row.latestPayment ? formatCurrency(row.latestPayment.paidAmount) : "-"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {row.latestPayment ? formatCurrency(row.latestPayment.amount) : "-"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {row.latestPayment ? formatCurrency(row.latestPayment.rest) : "-"}
                    </td>
                    <td className="px-3 py-3">
                      <PaymentStatusBadge status={row.latestStatus} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {row.paymentCount}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            router.push(`/center/students/${row.student.id}/payments`);
                          }}
                        >
                          History
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!row.latestPayment) {
                              return;
                            }

                            void handleOpenReceipt(row.latestPayment.id);
                          }}
                          disabled={!row.latestPayment || openingReceiptId !== null}
                        >
                          {openingReceiptId === row.latestPayment?.id ? (
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
                      </div>
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
