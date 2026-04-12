"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BanknoteArrowDown, ReceiptText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppAuth, useToast } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import { listStudentGroups } from "@/modules/student-group/client/student-group-client";
import type { StudentGroup } from "@/modules/student-group/types/student-group.types";
import { createPayment, listPayments } from "../client/payment-client";
import { PaymentRecordFormDialog } from "./payment-record-form-dialog";
import { PaymentStatusBadge } from "./payment-status-badge";
import type { Payment } from "../types/payment.types";

type PaymentPageState = {
  isLoading: boolean;
  errorMessage: string | null;
  payments: Payment[];
  studentGroups: StudentGroup[];
};

const initialState: PaymentPageState = {
  isLoading: true,
  errorMessage: null,
  payments: [],
  studentGroups: [],
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

export function PaymentListPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, setUser, clearUser } = useAppAuth();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [state, setState] = useState<PaymentPageState>(initialState);
  const isSessionReady = user?.role === "ADMIN";

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

  const loadPageData = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const [payments, studentGroups] = await Promise.all([
        listPayments({
          page: 1,
          limit: 20,
        }),
        listStudentGroups({
          page: 1,
          limit: 100,
        }),
      ]);

      setState({
        isLoading: false,
        errorMessage: null,
        payments,
        studentGroups,
      });
    } catch (error: unknown) {
      setState({
        isLoading: false,
        errorMessage: extractErrorMessage(error, "Unable to load payments."),
        payments: [],
        studentGroups: [],
      });
    }
  }, []);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void (async () => {
      await loadPageData();
    })();
  }, [isSessionReady, loadPageData]);

  const handleCreatePayment = useCallback(
    async (payload: Parameters<typeof createPayment>[0]) => {
      try {
        await createPayment(payload);
        await loadPageData();
        toast.success("Payment recorded", "The payment was saved successfully.");
      } catch (error: unknown) {
        toast.error(
          "Unable to record payment",
          extractErrorMessage(error, "Please review the form values and try again."),
        );
        throw error;
      }
    },
    [loadPageData, toast],
  );

  const totalCollected = useMemo(
    () => state.payments.reduce((sum, payment) => sum + payment.paidAmount, 0),
    [state.payments],
  );

  const totalOutstanding = useMemo(
    () => state.payments.reduce((sum, payment) => sum + payment.rest, 0),
    [state.payments],
  );

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
              Record collected payments by student group and review the latest receipts flow.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={state.studentGroups.length === 0}
          >
            <BanknoteArrowDown className="mr-2 size-4" />
            Record payment
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Latest records
            </p>
            <p className="mt-2 text-2xl font-semibold">{state.payments.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Last 20 payments</p>
          </div>

          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Collected
            </p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalCollected)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sum of recorded paid amounts
            </p>
          </div>

          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Outstanding
            </p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalOutstanding)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Remaining balance from these records
            </p>
          </div>
        </div>

        {state.studentGroups.length === 0 ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Create at least one student group before recording payments, because the form
            derives the teacher from the selected group.
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Recent payments</h2>
        </div>

        {state.errorMessage ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.errorMessage}
          </div>
        ) : null}

        {state.isLoading ? (
          <div className="mt-4 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            Loading payments...
          </div>
        ) : state.payments.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            No payments recorded yet.
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
                  <th className="px-3 py-2 font-medium">Remaining</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {state.payments.map((payment) => (
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
                      {formatCurrency(payment.rest)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatDateTime(payment.paymentDate)}
                    </td>
                    <td className="px-3 py-3">
                      <PaymentStatusBadge status={payment.status} />
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
