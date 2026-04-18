"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Secretary } from "@/modules/secretary/types/secretary.types";
import type { Teacher } from "@/modules/teacher/types/teacher.types";
import type {
  CenterExpense,
  CenterExpenseCreatePayload,
  CenterExpenseUpdatePayload,
} from "../types/center-expense.types";

type ExpenseFormState = {
  user_id: string;
  amount: string;
  description: string;
  date: string;
};

type ExpenseFormErrors = Partial<{
  user_id: string;
  amount: string;
  description: string;
  date: string;
  form: string;
}>;

type CenterExpenseFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: Teacher[];
  secretaries: Secretary[];
  expense: CenterExpense | null;
  onCreate: (payload: CenterExpenseCreatePayload) => Promise<void>;
  onUpdate: (
    centerExpenseId: string,
    payload: CenterExpenseUpdatePayload,
  ) => Promise<void>;
};

type ExpenseUserOption = {
  id: string;
  label: string;
};

const emptyFormState: ExpenseFormState = {
  user_id: "",
  amount: "",
  description: "",
  date: "",
};

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70";

function getTeacherName(teacher: Teacher) {
  return `${teacher.firstName} ${teacher.lastName}`.trim();
}

function getSecretaryName(secretary: Secretary) {
  return `${secretary.firstName} ${secretary.lastName}`.trim();
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function buildValidationErrors(form: ExpenseFormState): ExpenseFormErrors {
  const errors: ExpenseFormErrors = {};

  if (!form.user_id.trim()) {
    errors.user_id = "Please select a user.";
  }

  const amount = Number(form.amount);
  if (!form.amount.trim()) {
    errors.amount = "Amount is required.";
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Amount must be a valid number greater than 0.";
  }

  const description = form.description.trim();
  if (!description) {
    errors.description = "Description is required.";
  } else if (description.length < 4) {
    errors.description = "Description must be at least 4 characters.";
  } else if (description.length > 5000) {
    errors.description = "Description must be 5000 characters or less.";
  }

  if (!form.date.trim()) {
    errors.date = "Date is required.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date.trim())) {
    errors.date = "Date must be in YYYY-MM-DD format.";
  }

  return errors;
}

export function CenterExpenseFormDialog({
  mode,
  open,
  onOpenChange,
  teachers,
  secretaries,
  expense,
  onCreate,
  onUpdate,
}: CenterExpenseFormDialogProps) {
  const [form, setForm] = useState<ExpenseFormState>(emptyFormState);
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userOptions = useMemo<ExpenseUserOption[]>(() => {
    const teacherOptions = teachers.map((teacher) => ({
      id: teacher.id,
      label: `${getTeacherName(teacher)} (Teacher)`,
    }));
    const secretaryOptions = secretaries.map((secretary) => ({
      id: secretary.id,
      label: `${getSecretaryName(secretary)} (Secretary)`,
    }));

    return [...teacherOptions, ...secretaryOptions].sort((left, right) =>
      left.label.localeCompare(right.label, undefined, {
        sensitivity: "base",
      }),
    );
  }, [secretaries, teachers]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setErrors({});
    if (mode === "edit" && expense) {
      setForm({
        user_id: expense.user_id,
        amount: String(expense.amount),
        description: expense.description,
        date: expense.date,
      });
    } else {
      setForm({
        user_id: userOptions[0]?.id ?? "",
        amount: "",
        description: "",
        date: getTodayDateValue(),
      });
    }
  }, [expense, mode, open, userOptions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const validationErrors = buildValidationErrors(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        user_id: form.user_id.trim(),
        amount: Number(Number(form.amount).toFixed(2)),
        description: form.description.trim(),
        date: form.date.trim(),
      };

      if (mode === "edit" && expense) {
        await onUpdate(expense.id, payload);
      } else {
        await onCreate(payload);
      }

      onOpenChange(false);
    } catch (error: unknown) {
      setErrors({
        form:
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : `Unable to ${mode === "edit" ? "update" : "create"} center expense right now.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Expense" : "Record Expense"}
          </DialogTitle>
          <DialogDescription>
            Select the user tied to the expense, then enter the amount,
            description, and date.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <label className="space-y-2">
            <span className="text-sm font-medium">User</span>
            <select
              value={form.user_id}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((previous) => ({
                  ...previous,
                  user_id: value,
                }));
                setErrors((previous) => ({
                  ...previous,
                  user_id: undefined,
                  form: undefined,
                }));
              }}
              className={selectClassName}
              disabled={isSubmitting || userOptions.length === 0}
            >
              {userOptions.length === 0 ? (
                <option value="">No active teachers or secretaries</option>
              ) : null}
              {userOptions.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                >
                  {option.label}
                </option>
              ))}
            </select>
            {errors.user_id ? (
              <p className="text-xs text-destructive">{errors.user_id}</p>
            ) : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Amount</span>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={form.amount}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((previous) => ({
                  ...previous,
                  amount: value,
                }));
                setErrors((previous) => ({
                  ...previous,
                  amount: undefined,
                  form: undefined,
                }));
              }}
              placeholder="0.00"
              disabled={isSubmitting}
            />
            {errors.amount ? (
              <p className="text-xs text-destructive">{errors.amount}</p>
            ) : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((previous) => ({
                  ...previous,
                  description: value,
                }));
                setErrors((previous) => ({
                  ...previous,
                  description: undefined,
                  form: undefined,
                }));
              }}
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70"
              placeholder="Explain the expense..."
              disabled={isSubmitting}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Date</span>
            <Input
              type="date"
              value={form.date}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((previous) => ({
                  ...previous,
                  date: value,
                }));
                setErrors((previous) => ({
                  ...previous,
                  date: undefined,
                  form: undefined,
                }));
              }}
              disabled={isSubmitting}
            />
            {errors.date ? (
              <p className="text-xs text-destructive">{errors.date}</p>
            ) : null}
          </label>

          {errors.form ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.form}
            </div>
          ) : null}

          <DialogFooter className="mt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || userOptions.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {mode === "edit" ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" />
                  {mode === "edit" ? "Save changes" : "Record expense"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
