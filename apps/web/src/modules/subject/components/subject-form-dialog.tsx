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
  Subject,
  SubjectCreatePayload,
  SubjectUpdatePayload,
} from "../types/subject.types";

type SubjectFormMode = "create" | "edit";

type SubjectFormState = {
  name: string;
  description: string;
};

const emptyFormState: SubjectFormState = {
  name: "",
  description: "",
};

type SubjectFormDialogProps = {
  mode: SubjectFormMode;
  subject: Subject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: SubjectCreatePayload) => Promise<void>;
  onUpdate: (subjectId: string, payload: SubjectUpdatePayload) => Promise<void>;
};

function toFormState(mode: SubjectFormMode, subject: Subject | null): SubjectFormState {
  if (mode === "edit" && subject) {
    return {
      name: subject.name,
      description: subject.description,
    };
  }

  return emptyFormState;
}

function buildCreatePayload(form: SubjectFormState): SubjectCreatePayload {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
  };
}

function buildUpdatePayload(
  form: SubjectFormState,
  subject: Subject,
): SubjectUpdatePayload {
  const payload: SubjectUpdatePayload = {};
  const name = form.name.trim();
  const description = form.description.trim();

  if (name && name !== subject.name) {
    payload.name = name;
  }

  if (description && description !== subject.description) {
    payload.description = description;
  }

  return payload;
}

export function SubjectFormDialog({
  mode,
  subject,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: SubjectFormDialogProps) {
  const [form, setForm] = useState<SubjectFormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(toFormState(mode, subject));
    setErrorMessage(null);
  }, [mode, open, subject]);

  const title = useMemo(
    () => (isEditMode ? "Edit Subject" : "Create Subject"),
    [isEditMode],
  );

  const description = useMemo(
    () =>
      isEditMode
        ? "Update subject information for the current center."
        : "Create a new subject that can be linked to teachers and groups.",
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
        if (!subject) {
          throw new Error("Subject context is missing.");
        }

        const payload = buildUpdatePayload(form, subject);
        if (Object.keys(payload).length === 0) {
          throw new Error("No fields changed.");
        }

        await onUpdate(subject.id, payload);
      } else {
        const payload = buildCreatePayload(form);
        await onCreate(payload);
      }

      onOpenChange(false);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to submit subject form right now.",
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
          <label className="space-y-2">
            <span className="text-sm font-medium">Subject name</span>
            <Input
              name="name"
              value={form.name}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((previous) => ({
                  ...previous,
                  name: value,
                }));
              }}
              minLength={2}
              maxLength={140}
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((previous) => ({
                  ...previous,
                  description: value,
                }));
              }}
              minLength={4}
              maxLength={5000}
              required
              rows={5}
              className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              placeholder="Describe the scope and learning goals of this subject"
            />
          </label>

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
                  Create subject
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
