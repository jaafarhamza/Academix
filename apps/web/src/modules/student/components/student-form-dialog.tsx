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
  SchoolCycle,
  SchoolYear,
  Student,
  StudentCreatePayload,
  StudentUpdatePayload,
} from "../types/student.types";

type StudentFormMode = "create" | "edit";

type StudentFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  parentPhone: string;
  schoolName: string;
  schoolCycle: string;
  schoolYear: string;
};

const schoolYearLabels: Record<SchoolYear, string> = {
  FIRST_YEAR: "1st Year",
  SECOND_YEAR: "2nd Year",
  THIRD_YEAR: "3rd Year",
  FOURTH_YEAR: "4th Year",
  FIFTH_YEAR: "5th Year",
  SIXTH_YEAR: "6th Year",
};

const schoolCycleLabels: Record<SchoolCycle, string> = {
  PRIMARY: "Primary",
  COLLEGE: "College",
  LYCEE: "Lycee",
};

const schoolYearOptions = Object.entries(schoolYearLabels) as Array<
  [SchoolYear, string]
>;

const schoolCycleOptions = Object.entries(schoolCycleLabels) as Array<
  [SchoolCycle, string]
>;

const allowedSchoolYearsByCycle: Record<SchoolCycle, SchoolYear[]> = {
  PRIMARY: schoolYearOptions.map(([schoolYear]) => schoolYear),
  COLLEGE: ["FIRST_YEAR", "SECOND_YEAR", "THIRD_YEAR"],
  LYCEE: ["FIRST_YEAR", "SECOND_YEAR", "THIRD_YEAR"],
};

const emptyFormState: StudentFormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  parentPhone: "",
  schoolName: "",
  schoolCycle: "",
  schoolYear: "",
};

type StudentFormDialogProps = {
  mode: StudentFormMode;
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: StudentCreatePayload) => Promise<void>;
  onUpdate: (studentId: string, payload: StudentUpdatePayload) => Promise<void>;
};

function parseSchoolCycle(value: string): SchoolCycle | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  return schoolCycleOptions.find(([schoolCycle]) => schoolCycle === normalized)?.[0] ?? null;
}

function parseSchoolYear(value: string): SchoolYear | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  return schoolYearOptions.find(([schoolYear]) => schoolYear === normalized)?.[0] ?? null;
}

function getAllowedSchoolYears(cycle: SchoolCycle | null): SchoolYear[] {
  if (!cycle) {
    return [];
  }

  return allowedSchoolYearsByCycle[cycle];
}

function isSchoolYearAllowedForCycle(cycle: SchoolCycle, schoolYear: SchoolYear) {
  return allowedSchoolYearsByCycle[cycle].includes(schoolYear);
}

function toFormState(mode: StudentFormMode, student: Student | null): StudentFormState {
  if (mode === "edit" && student) {
    return {
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      password: "",
      phone: student.phone,
      parentPhone: student.parentPhone ?? "",
      schoolName: student.schoolName ?? "",
      schoolCycle: student.schoolCycle ?? "",
      schoolYear: student.schoolYear ?? "",
    };
  }

  return emptyFormState;
}

function buildCreatePayload(form: StudentFormState): StudentCreatePayload {
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const email = form.email.trim();
  const password = form.password;
  const phone = form.phone.trim();
  const parentPhone = form.parentPhone.trim();
  const schoolName = form.schoolName.trim();
  const schoolCycle = parseSchoolCycle(form.schoolCycle);
  const schoolYear = parseSchoolYear(form.schoolYear);

  if (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !phone ||
    !parentPhone ||
    !schoolName ||
    !schoolCycle ||
    !schoolYear
  ) {
    throw new Error("All fields are required.");
  }

  if (!isSchoolYearAllowedForCycle(schoolCycle, schoolYear)) {
    throw new Error("Selected school year is not valid for this cycle.");
  }

  return {
    firstName,
    lastName,
    email,
    password,
    phone,
    parentPhone,
    schoolName,
    schoolCycle,
    schoolYear,
  };
}

function buildUpdatePayload(form: StudentFormState, student: Student): StudentUpdatePayload {
  const payload: StudentUpdatePayload = {};

  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();
  const parentPhone = form.parentPhone.trim();
  const schoolName = form.schoolName.trim();
  const schoolCycle = parseSchoolCycle(form.schoolCycle);
  const schoolYear = parseSchoolYear(form.schoolYear);

  if (firstName && firstName !== student.firstName) {
    payload.firstName = firstName;
  }

  if (lastName && lastName !== student.lastName) {
    payload.lastName = lastName;
  }

  if (email && email !== student.email) {
    payload.email = email;
  }

  if (phone && phone !== student.phone) {
    payload.phone = phone;
  }

  if (parentPhone && parentPhone !== (student.parentPhone ?? "")) {
    payload.parentPhone = parentPhone;
  }

  if (schoolName && schoolName !== (student.schoolName ?? "")) {
    payload.schoolName = schoolName;
  }

  const studentCycle = student.schoolCycle ?? "";
  const studentYear = student.schoolYear ?? "";

  if (schoolCycle && schoolCycle !== studentCycle) {
    payload.schoolCycle = schoolCycle;
  }

  if (schoolYear && schoolYear !== studentYear) {
    payload.schoolYear = schoolYear;
  }

  if (payload.schoolCycle && !payload.schoolYear && schoolYear) {
    payload.schoolYear = schoolYear;
  }

  if (payload.schoolCycle && payload.schoolYear) {
    if (!isSchoolYearAllowedForCycle(payload.schoolCycle, payload.schoolYear)) {
      throw new Error("Selected school year is not valid for this cycle.");
    }
  }

  return payload;
}

export function StudentFormDialog({
  mode,
  student,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: StudentFormDialogProps) {
  const [form, setForm] = useState<StudentFormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditMode = mode === "edit";
  const selectedCycle = parseSchoolCycle(form.schoolCycle);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(toFormState(mode, student));
    setErrorMessage(null);
  }, [mode, open, student]);

  const allowedSchoolYears = useMemo(
    () => getAllowedSchoolYears(selectedCycle),
    [selectedCycle],
  );

  useEffect(() => {
    const selectedSchoolYear = parseSchoolYear(form.schoolYear);
    if (!selectedCycle) {
      if (form.schoolYear) {
        setForm((previous) => ({
          ...previous,
          schoolYear: "",
        }));
      }
      return;
    }

    if (selectedSchoolYear && isSchoolYearAllowedForCycle(selectedCycle, selectedSchoolYear)) {
      return;
    }

    const nextSchoolYear = allowedSchoolYears[0] ?? "";
    setForm((previous) => ({
      ...previous,
      schoolYear: nextSchoolYear,
    }));
  }, [allowedSchoolYears, form.schoolYear, selectedCycle]);

  const title = useMemo(
    () => (isEditMode ? "Edit Student" : "Create Student"),
    [isEditMode],
  );

  const description = useMemo(
    () =>
      isEditMode
        ? "Update student profile fields for the current center."
        : "Create a student account with school cycle and school year.",
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
        if (!student) {
          throw new Error("Student context is missing.");
        }

        const payload = buildUpdatePayload(form, student);
        if (Object.keys(payload).length === 0) {
          throw new Error("No fields changed.");
        }

        await onUpdate(student.id, payload);
      } else {
        const payload = buildCreatePayload(form);
        await onCreate(payload);
      }

      onOpenChange(false);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to submit student form right now.",
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
              <span className="text-sm font-medium">Parent phone</span>
              <Input
                name="parentPhone"
                type="tel"
                autoComplete="tel"
                value={form.parentPhone}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((previous) => ({
                    ...previous,
                    parentPhone: value,
                  }));
                }}
                pattern="^\+?[1-9]\d{7,14}$"
                title="Use international format, for example +212600000011"
                placeholder="+212600000011"
                required
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium">School name</span>
            <Input
              name="schoolName"
              value={form.schoolName}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((previous) => ({
                  ...previous,
                  schoolName: value,
                }));
              }}
              minLength={2}
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">School cycle</span>
              <select
                value={form.schoolCycle}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((previous) => ({
                    ...previous,
                    schoolCycle: value,
                  }));
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                required
              >
                <option value="">Select cycle</option>
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

            <label className="space-y-2">
              <span className="text-sm font-medium">School year</span>
              <select
                value={form.schoolYear}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((previous) => ({
                    ...previous,
                    schoolYear: value,
                  }));
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!selectedCycle}
                required
              >
                <option value="">
                  {selectedCycle ? "Select year" : "Choose cycle first"}
                </option>
                {allowedSchoolYears.map((schoolYear) => (
                  <option
                    key={schoolYear}
                    value={schoolYear}
                  >
                    {schoolYearLabels[schoolYear]}
                  </option>
                ))}
              </select>
            </label>
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
                  Create student
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
