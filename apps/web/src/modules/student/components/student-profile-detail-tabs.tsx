"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { openPaymentReceipt } from "@/modules/payment/client/payment-client";
import { PaymentStatusBadge } from "@/modules/payment/components/payment-status-badge";
import { getStudentPaymentHistory } from "../client/student-client";
import {
  schoolCycleLabels,
  schoolYearLabels,
} from "../constants/student-labels";
import type {
  StudentDetail,
  StudentPaymentHistory,
} from "../types/student.types";

type StudentProfileDetailTabsProps = {
  student: StudentDetail;
  onOpenFullHistory: () => void;
};

type StudentPaymentHistoryState = {
  isLoading: boolean;
  errorMessage: string | null;
  value: StudentPaymentHistory | null;
};

const initialPaymentHistoryState: StudentPaymentHistoryState = {
  isLoading: false,
  errorMessage: null,
  value: null,
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

function extractErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

export function StudentProfileDetailTabs({
  student,
  onOpenFullHistory,
}: StudentProfileDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "payments">("overview");
  const [openingReceiptId, setOpeningReceiptId] = useState<string | null>(null);
  const [paymentHistoryState, setPaymentHistoryState] = useState(
    initialPaymentHistoryState,
  );

  const loadPaymentHistory = useCallback(async () => {
    setPaymentHistoryState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const paymentHistory = await getStudentPaymentHistory(student.id);
      setPaymentHistoryState({
        isLoading: false,
        errorMessage: null,
        value: paymentHistory,
      });
    } catch (error: unknown) {
      setPaymentHistoryState({
        isLoading: false,
        errorMessage: extractErrorMessage(
          error,
          "Unable to load student payment history.",
        ),
        value: null,
      });
    }
  }, [student.id]);

  useEffect(() => {
    if (activeTab !== "payments" || paymentHistoryState.value) {
      return;
    }

    void loadPaymentHistory();
  }, [activeTab, loadPaymentHistory, paymentHistoryState.value]);

  const handleOpenReceipt = useCallback(
    async (paymentId: string) => {
      if (openingReceiptId) {
        return;
      }

      setOpeningReceiptId(paymentId);
      try {
        await openPaymentReceipt(paymentId);
      } finally {
        setOpeningReceiptId(null);
      }
    },
    [openingReceiptId],
  );

  const lastPaymentDate = useMemo(() => {
    return paymentHistoryState.value?.paymentSummary.lastPaymentDate ?? null;
  }, [paymentHistoryState.value?.paymentSummary.lastPaymentDate]);

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border bg-background p-1">
        <Button
          type="button"
          variant={activeTab === "overview" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </Button>
        <Button
          type="button"
          variant={activeTab === "payments" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("payments")}
        >
          Payment History
        </Button>
      </div>

      {activeTab === "overview" ? (
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
              <dd className="font-medium">{formatDateTime(student.createdAt)}</dd>
            </div>
          </dl>

          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <p className="text-xs text-muted-foreground">Payments</p>
              <p className="font-semibold">{student.paymentSummary.totalPayments}</p>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="font-semibold">
                {formatCurrency(student.paymentSummary.totalAmount)}
              </p>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="font-semibold">
                {formatCurrency(student.paymentSummary.totalPaid)}
              </p>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="font-semibold">
                {formatCurrency(student.paymentSummary.outstandingBalance)}
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
                      {formatDate(enrollment.enrollmentDate)}
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
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
            <p className="text-sm font-medium">Payment history</p>
            <p className="text-xs text-muted-foreground">
                Review all recorded payments for this student.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onOpenFullHistory}>
              Open full page
            </Button>
          </div>

          {paymentHistoryState.isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border bg-background/60 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading payment history...
            </div>
          ) : paymentHistoryState.errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
              <p>{paymentHistoryState.errorMessage}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  void loadPaymentHistory();
                }}
              >
                Retry
              </Button>
            </div>
          ) : paymentHistoryState.value ? (
            <>
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-4">
                <div className="rounded-md border bg-background/60 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Total payments</p>
                  <p className="font-semibold">
                    {paymentHistoryState.value.paymentSummary.totalPayments}
                  </p>
                </div>
                <div className="rounded-md border bg-background/60 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Total paid</p>
                  <p className="font-semibold">
                    {formatCurrency(paymentHistoryState.value.paymentSummary.totalPaid)}
                  </p>
                </div>
                <div className="rounded-md border bg-background/60 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="font-semibold">
                    {formatCurrency(
                      paymentHistoryState.value.paymentSummary.outstandingBalance,
                    )}
                  </p>
                </div>
                <div className="rounded-md border bg-background/60 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Last payment</p>
                  <p className="font-semibold">
                    {lastPaymentDate ? formatDate(lastPaymentDate) : "-"}
                  </p>
                </div>
              </div>

              {paymentHistoryState.value.payments.length === 0 ? (
                <div className="rounded-md border bg-background/60 px-3 py-6 text-sm text-muted-foreground">
                  No payments found for this student.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border bg-background/40">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Teacher</th>
                        <th className="px-3 py-2 font-medium">Group</th>
                        <th className="px-3 py-2 font-medium">Collected</th>
                        <th className="px-3 py-2 font-medium">Remaining</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {paymentHistoryState.value.payments.map((payment) => (
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
            </>
          ) : (
            <div className="rounded-md border bg-background/60 px-3 py-6 text-sm text-muted-foreground">
              Select the payment history tab to load this student&apos;s payments.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
