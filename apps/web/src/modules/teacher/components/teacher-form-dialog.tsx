"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, PencilLine, Plus } from "lucide-react";

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
import type {
  Teacher,
  TeacherCreatePayload,
  TeacherUpdatePayload,
} from "../types/teacher.types";

type TeacherFormMode = "create" | "edit";

type TeacherFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cin: string;
  password: string;
  hourlyRate: string;
  maxHoursPerWeek: string;
};

const emptyFormState: TeacherFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  cin: "",
  password: "",
  hourlyRate: "",
  maxHoursPerWeek: "",
};

type TeacherFormDialogProps = {
  mode: TeacherFormMode;
  teacher: Teacher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: TeacherCreatePayload) => Promise<void>;
  onUpdate: (teacherId: string, payload: TeacherUpdatePayload) => Promise<void>;
};

function parseOptionalPositiveNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error("Numeric fields must contain valid numbers.");
  }

  return parsed;
}

function toFormState(mode: TeacherFormMode, teacher: Teacher | null): TeacherFormState {
  if (mode === "edit" && teacher) {
    return {
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      cin: teacher.cin ?? "",
      password: "",
      hourlyRate: "",
      maxHoursPerWeek: "",
    };
  }

  return emptyFormState;
}

function buildCreatePayload(form: TeacherFormState): TeacherCreatePayload {
  const payload: TeacherCreatePayload = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    password: form.password,
    phone: form.phone.trim(),
    cin: form.cin.trim(),
  };

  const hourlyRate = parseOptionalPositiveNumber(form.hourlyRate);
  if (hourlyRate !== undefined) {
    payload.hourlyRate = hourlyRate;
  }

  const maxHoursPerWeek = parseOptionalPositiveNumber(form.maxHoursPerWeek);
  if (maxHoursPerWeek !== undefined) {
    payload.maxHoursPerWeek = maxHoursPerWeek;
  }

  return payload;
}

function buildUpdatePayload(form: TeacherFormState, teacher: Teacher): TeacherUpdatePayload {
  const payload: TeacherUpdatePayload = {};
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();
  const cin = form.cin.trim();

  if (firstName && firstName !== teacher.firstName) {
    payload.firstName = firstName;
  }

  if (lastName && lastName !== teacher.lastName) {
    payload.lastName = lastName;
  }

  if (email && email !== teacher.email) {
    payload.email = email;
  }

  if (phone && phone !== teacher.phone) {
    payload.phone = phone;
  }

  if (cin && cin !== (teacher.cin ?? "")) {
    payload.cin = cin;
  }

  return payload;
}

export function TeacherFormDialog({
  mode,
  teacher,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: TeacherFormDialogProps) {
  const [form, setForm] = useState<TeacherFormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(toFormState(mode, teacher));
    setErrorMessage(null);
  }, [mode, open, teacher]);

  const title = useMemo(
    () => (isEditMode ? "Edit Teacher" : "Create Teacher"),
    [isEditMode],
  );

  const description = useMemo(
    () =>
      isEditMode
        ? "Update teacher profile fields for the current center."
        : "Create a teacher account and set initial access credentials.",
    [isEditMode],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEditMode) {
        if (!teacher) {
          throw new Error("Teacher context is missing.");
        }

        const payload = buildUpdatePayload(form, teacher);
        if (Object.keys(payload).length === 0) {
          throw new Error("No fields changed.");
        }

        await onUpdate(teacher.id, payload);
      } else {
        const payload = buildCreatePayload(form);
        await onCreate(payload);
      }

      onOpenChange(false);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to submit teacher form right now.",
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">First name</span>
              <Input
                name="firstName"
                autoComplete="given-name"
                value={form.firstName}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((previous) => ({
                    ...previous,
                    firstName: value,
                  }));
                }}
                minLength={2}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Last name</span>
              <Input
                name="lastName"
                autoComplete="family-name"
                value={form.lastName}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((previous) => ({
                    ...previous,
                    lastName: value,
                  }));
                }}
                minLength={2}
                required
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium">Email</span>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((previous) => ({
                  ...previous,
                  email: value,
                }));
              }}
              required
            />
          </label>

          {!isEditMode ? (
            <label className="space-y-2">
              <span className="text-sm font-medium">Password</span>
              <Input
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((previous) => ({
                    ...previous,
                    password: value,
                  }));
                }}
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">
                Use at least 8 characters with uppercase, lowercase, number, and symbol.
              </p>
            </label>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Phone</span>
              <Input
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((previous) => ({
                    ...previous,
                    phone: value,
                  }));
                }}
                pattern="^\+?[1-9]\d{7,14}$"
                title="Use international format, for example +212600000010"
                placeholder="+212600000010"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">CIN</span>
              <Input
                name="cin"
                value={form.cin}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((previous) => ({
                    ...previous,
                    cin: value,
                  }));
                }}
                minLength={3}
                required
              />
            </label>
          </div>

          {!isEditMode ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Hourly rate (optional)</span>
                <Input
                  name="hourlyRate"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={form.hourlyRate}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((previous) => ({
                      ...previous,
                      hourlyRate: value,
                    }));
                  }}
                  placeholder="120"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">Max hours/week (optional)</span>
                <Input
                  name="maxHoursPerWeek"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={168}
                  step="0.25"
                  value={form.maxHoursPerWeek}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((previous) => ({
                      ...previous,
                      maxHoursPerWeek: value,
                    }));
                  }}
                  placeholder="24"
                />
              </label>
            </div>
          ) : null}

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
                  Saving...
                </>
              ) : isEditMode ? (
                <>
                  <PencilLine className="size-4" />
                  Save changes
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Create teacher
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
