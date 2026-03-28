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
  Secretary,
  SecretaryCreatePayload,
  SecretaryUpdatePayload,
} from "../types/secretary.types";

type SecretaryFormMode = "create" | "edit";

type SecretaryFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cin: string;
  password: string;
};

const emptyFormState: SecretaryFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  cin: "",
  password: "",
};

type SecretaryFormDialogProps = {
  mode: SecretaryFormMode;
  secretary: Secretary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: SecretaryCreatePayload) => Promise<void>;
  onUpdate: (secretaryId: string, payload: SecretaryUpdatePayload) => Promise<void>;
};

function toFormState(
  mode: SecretaryFormMode,
  secretary: Secretary | null,
): SecretaryFormState {
  if (mode === "edit" && secretary) {
    return {
      firstName: secretary.firstName,
      lastName: secretary.lastName,
      email: secretary.email,
      phone: secretary.phone,
      cin: secretary.cin ?? "",
      password: "",
    };
  }

  return emptyFormState;
}

function buildCreatePayload(form: SecretaryFormState): SecretaryCreatePayload {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    password: form.password,
    phone: form.phone.trim(),
    cin: form.cin.trim(),
  };
}

function buildUpdatePayload(
  form: SecretaryFormState,
  secretary: Secretary,
): SecretaryUpdatePayload {
  const payload: SecretaryUpdatePayload = {};
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();
  const cin = form.cin.trim();

  if (firstName && firstName !== secretary.firstName) {
    payload.firstName = firstName;
  }

  if (lastName && lastName !== secretary.lastName) {
    payload.lastName = lastName;
  }

  if (email && email !== secretary.email) {
    payload.email = email;
  }

  if (phone && phone !== secretary.phone) {
    payload.phone = phone;
  }

  if (cin && cin !== (secretary.cin ?? "")) {
    payload.cin = cin;
  }

  return payload;
}

export function SecretaryFormDialog({
  mode,
  secretary,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: SecretaryFormDialogProps) {
  const [form, setForm] = useState<SecretaryFormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(toFormState(mode, secretary));
    setErrorMessage(null);
  }, [mode, open, secretary]);

  const title = useMemo(
    () => (isEditMode ? "Edit Secretary" : "Create Secretary"),
    [isEditMode],
  );

  const description = useMemo(
    () =>
      isEditMode
        ? "Update secretary profile fields for the current center."
        : "Create a secretary account and set initial access credentials.",
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
        if (!secretary) {
          throw new Error("Secretary context is missing.");
        }

        const payload = buildUpdatePayload(form, secretary);
        if (Object.keys(payload).length === 0) {
          throw new Error("No fields changed.");
        }

        await onUpdate(secretary.id, payload);
      } else {
        const payload = buildCreatePayload(form);
        await onCreate(payload);
      }

      onOpenChange(false);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to submit secretary form right now.",
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
                  Create secretary
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
