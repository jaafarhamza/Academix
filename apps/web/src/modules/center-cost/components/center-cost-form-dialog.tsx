"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BadgePercent, Loader2, Plus } from "lucide-react";

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
import type { Teacher } from "@/modules/teacher/types/teacher.types";
import type {
  CenterCostCreatePayload,
  CenterCostDeductionType,
} from "../types/center-cost.types";

type CostFormState = {
  scope: "GLOBAL" | "PER_TEACHER";
  teacher_id: string;
  deduction_type: CenterCostDeductionType;
  value: string;
};

const defaultFormState: CostFormState = {
  scope: "GLOBAL",
  teacher_id: "",
  deduction_type: "PERCENTAGE_OF_TOTAL",
  value: "",
};

const deductionTypeOptions: Array<{
  value: CenterCostDeductionType;
  label: string;
}> = [
  {
    value: "PERCENTAGE_OF_TOTAL",
    label: "Percent of total",
  },
  {
    value: "PERCENTAGE_PER_STUDENT",
    label: "Percent per student",
  },
  {
    value: "FIXED_PER_STUDENT",
    label: "Fixed per student",
  },
];

type CenterCostFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: Teacher[];
  onCreate: (payload: CenterCostCreatePayload) => Promise<void>;
};

function formatDeductionTypeLabel(value: CenterCostDeductionType) {
  return deductionTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function buildCenterCostName(
  scope: CostFormState["scope"],
  deductionType: CenterCostDeductionType,
  teacher: Teacher | null,
) {
  const deductionLabel = formatDeductionTypeLabel(deductionType);

  if (scope === "PER_TEACHER" && teacher) {
    return `${teacher.firstName} ${teacher.lastName} - ${deductionLabel}`;
  }

  return `Global - ${deductionLabel}`;
}

export function CenterCostFormDialog({
  open,
  onOpenChange,
  teachers,
  onCreate,
}: CenterCostFormDialogProps) {
  const [form, setForm] = useState<CostFormState>(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(defaultFormState);
    setErrorMessage(null);
  }, [open]);

  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => teacher.id === form.teacher_id) ?? null,
    [form.teacher_id, teachers],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedValue = form.value.trim();
    const parsedValue = Number(normalizedValue);

    if (form.scope === "PER_TEACHER" && !selectedTeacher) {
      setErrorMessage("Please select a teacher for a per-teacher rule.");
      return;
    }

    if (!normalizedValue || !Number.isFinite(parsedValue)) {
      setErrorMessage("Please enter a valid numeric value.");
      return;
    }

    if (
      (form.deduction_type === "PERCENTAGE_OF_TOTAL" ||
        form.deduction_type === "PERCENTAGE_PER_STUDENT") &&
      (parsedValue < 0 || parsedValue > 100)
    ) {
      setErrorMessage("Percentage deductions must be between 0 and 100.");
      return;
    }

    if (form.deduction_type === "FIXED_PER_STUDENT" && parsedValue <= 0) {
      setErrorMessage("Fixed deductions must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onCreate({
        teacher_id: form.scope === "PER_TEACHER" ? selectedTeacher?.id : undefined,
        deduction_type: form.deduction_type,
        value: parsedValue,
        name: buildCenterCostName(form.scope, form.deduction_type, selectedTeacher),
      });
      onOpenChange(false);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to create center cost right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Cost Rule</DialogTitle>
          <DialogDescription>
            Choose whether the deduction is global or tied to a teacher, then set
            the deduction type and value.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <label className="space-y-2">
            <span className="text-sm font-medium">Scope</span>
            <select
              value={form.scope}
              onChange={(event) => {
                const scope = event.currentTarget.value as CostFormState["scope"];
                setForm((previous) => ({
                  ...previous,
                  scope,
                  teacher_id: scope === "GLOBAL" ? "" : previous.teacher_id,
                }));
              }}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="GLOBAL">Global</option>
              <option value="PER_TEACHER">Per teacher</option>
            </select>
          </label>

          {form.scope === "PER_TEACHER" ? (
            <label className="space-y-2">
              <span className="text-sm font-medium">Teacher</span>
              <select
                value={form.teacher_id}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((previous) => ({
                    ...previous,
                    teacher_id: value,
                  }));
                }}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                required
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option
                    key={teacher.id}
                    value={teacher.id}
                  >
                    {teacher.firstName} {teacher.lastName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="space-y-2">
            <span className="text-sm font-medium">Deduction type</span>
            <select
              value={form.deduction_type}
              onChange={(event) => {
                const value = event.currentTarget.value as CenterCostDeductionType;
                setForm((previous) => ({
                  ...previous,
                  deduction_type: value,
                }));
              }}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {deductionTypeOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Value</span>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={
                form.deduction_type === "FIXED_PER_STUDENT"
                  ? "0.01"
                  : "0"
              }
              max={
                form.deduction_type === "FIXED_PER_STUDENT"
                  ? undefined
                  : "100"
              }
              value={form.value}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((previous) => ({
                  ...previous,
                  value,
                }));
              }}
              placeholder={
                form.deduction_type === "FIXED_PER_STUDENT"
                  ? "e.g. 50"
                  : "e.g. 10"
              }
              required
            />
            <p className="text-xs text-muted-foreground">
              {form.deduction_type === "FIXED_PER_STUDENT"
                ? "This value is treated as a fixed currency amount per paid student."
                : "This value is treated as a percentage."}
            </p>
          </label>

          <div className="rounded-xl border bg-muted/40 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <BadgePercent className="size-4 text-muted-foreground" />
              Preview
            </div>
            <p className="mt-2 text-muted-foreground">
              {buildCenterCostName(form.scope, form.deduction_type, selectedTeacher)}
            </p>
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          <DialogFooter>
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Create rule
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
