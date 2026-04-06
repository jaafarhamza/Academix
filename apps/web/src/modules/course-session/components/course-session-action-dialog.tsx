"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, RotateCcw, XCircle } from "lucide-react";

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
import { CourseSessionClientError } from "../client/course-session-client";
import type {
  CourseSession,
  CourseSessionReschedulePayload,
} from "../types/course-session.types";

type CourseSessionActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CourseSession | null;
  teacherName: string;
  subjectName: string;
  roomName: string;
  audienceLabel: string;
  onCancel: (sessionId: string) => Promise<void>;
  onReschedule: (
    sessionId: string,
    payload: CourseSessionReschedulePayload,
  ) => Promise<void>;
};

type DialogMode = "details" | "reschedule";

type RescheduleFormState = {
  day: CourseSession["day"];
  startTime: string;
  endTime: string;
};

type RescheduleFormErrors = Partial<{
  schedule: string;
  conflicts: string;
  form: string;
}>;

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

const sessionDayOptions: Array<{ value: CourseSession["day"]; label: string }> = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const dayLabelMap = new Map(sessionDayOptions.map((option) => [option.value, option.label]));

const statusLabelMap: Record<CourseSession["status"], string> = {
  SCHEDULED: "Scheduled",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

function buildInitialFormState(session: CourseSession | null): RescheduleFormState {
  return {
    day: session?.day ?? "MONDAY",
    startTime: session?.startTime ?? "08:00",
    endTime: session?.endTime ?? "09:00",
  };
}

function buildValidationErrors(
  form: RescheduleFormState,
): RescheduleFormErrors {
  if (!/^\d{2}:\d{2}$/.test(form.startTime.trim())) {
    return {
      schedule: "Start time must use HH:mm format.",
    };
  }

  if (!/^\d{2}:\d{2}$/.test(form.endTime.trim())) {
    return {
      schedule: "End time must use HH:mm format.",
    };
  }

  if (form.endTime.trim() <= form.startTime.trim()) {
    return {
      schedule: "End time must be after start time.",
    };
  }

  return {};
}

function buildErrorState(error: unknown): RescheduleFormErrors {
  if (error instanceof CourseSessionClientError) {
    if (error.conflicts.length > 0) {
      return {
        conflicts: error.conflicts.map((conflict) => conflict.message).join(" "),
      };
    }

    return {
      form: error.message,
    };
  }

  return {
    form:
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Unable to update the session right now.",
  };
}

function renderInlineError(message: string | undefined) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export function CourseSessionActionDialog({
  open,
  onOpenChange,
  session,
  teacherName,
  subjectName,
  roomName,
  audienceLabel,
  onCancel,
  onReschedule,
}: CourseSessionActionDialogProps) {
  const [mode, setMode] = useState<DialogMode>("details");
  const [form, setForm] = useState<RescheduleFormState>(buildInitialFormState(session));
  const [errors, setErrors] = useState<RescheduleFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  const isScheduled = session?.status === "SCHEDULED";

  useEffect(() => {
    if (!open) {
      return;
    }

    setMode("details");
    setForm(buildInitialFormState(session));
    setErrors({});
    setIsConfirmingCancel(false);
  }, [open, session]);

  const title = useMemo(
    () => (mode === "reschedule" ? "Reschedule Session" : "Session Details"),
    [mode],
  );

  const description = useMemo(() => {
    if (mode === "reschedule") {
      return "Update the weekly day and time for this session.";
    }

    return "Review session details, then cancel or reschedule it from here.";
  }, [mode]);

  async function handleCancel() {
    if (!session || isSubmitting) {
      return;
    }

    if (!isConfirmingCancel) {
      setIsConfirmingCancel(true);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await onCancel(session.id);
      onOpenChange(false);
    } catch (error: unknown) {
      setErrors(buildErrorState(error));
    } finally {
      setIsSubmitting(false);
      setIsConfirmingCancel(false);
    }
  }

  async function handleRescheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || isSubmitting) {
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
      await onReschedule(session.id, {
        day: form.day,
        startTime: form.startTime.trim(),
        endTime: form.endTime.trim(),
      });
      onOpenChange(false);
    } catch (error: unknown) {
      setErrors(buildErrorState(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!session ? null : mode === "reschedule" ? (
          <form onSubmit={handleRescheduleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium">Day</span>
                <select
                  value={form.day}
                  onChange={(event) => {
                    const day = event.currentTarget.value as CourseSession["day"];
                    setErrors((previous) => ({
                      ...previous,
                      schedule: undefined,
                      conflicts: undefined,
                      form: undefined,
                    }));
                    setForm((previous) => ({
                      ...previous,
                      day,
                    }));
                  }}
                  className={selectClassName}
                >
                  {sessionDayOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">Start time</span>
                <Input
                  type="time"
                  step={300}
                  value={form.startTime}
                  onChange={(event) => {
                    const startTime = event.currentTarget.value;
                    setErrors((previous) => ({
                      ...previous,
                      schedule: undefined,
                      conflicts: undefined,
                      form: undefined,
                    }));
                    setForm((previous) => ({
                      ...previous,
                      startTime,
                    }));
                  }}
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">End time</span>
                <Input
                  type="time"
                  step={300}
                  value={form.endTime}
                  onChange={(event) => {
                    const endTime = event.currentTarget.value;
                    setErrors((previous) => ({
                      ...previous,
                      schedule: undefined,
                      conflicts: undefined,
                      form: undefined,
                    }));
                    setForm((previous) => ({
                      ...previous,
                      endTime,
                    }));
                  }}
                  required
                />
              </label>
            </div>

            {renderInlineError(errors.schedule)}
            {renderInlineError(errors.conflicts)}
            {errors.form ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.form}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode("details");
                  setErrors({});
                  setForm(buildInitialFormState(session));
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RotateCcw className="size-4" />
                )}
                Save schedule
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Audience
                </p>
                <p className="mt-1 font-medium">{audienceLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Subject
                </p>
                <p className="mt-1 font-medium">{subjectName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Teacher
                </p>
                <p className="mt-1 font-medium">{teacherName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Room
                </p>
                <p className="mt-1 font-medium">{roomName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Weekly slot
                </p>
                <p className="mt-1 font-medium">
                  {dayLabelMap.get(session.day) ?? session.day} | {session.startTime} -{" "}
                  {session.endTime}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <p className="mt-1 font-medium">{statusLabelMap[session.status]}</p>
              </div>
            </div>

            {isConfirmingCancel ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Confirm cancellation for this scheduled session.
              </p>
            ) : null}

            {errors.form ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.form}
              </p>
            ) : null}

            {!isScheduled ? (
              <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Only scheduled sessions can be cancelled or rescheduled.
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode("reschedule");
                  setErrors({});
                  setIsConfirmingCancel(false);
                }}
                disabled={!isScheduled || isSubmitting}
              >
                <CalendarClock className="size-4" />
                Reschedule
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  void handleCancel();
                }}
                disabled={!isScheduled || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
                {isConfirmingCancel ? "Confirm cancel" : "Cancel session"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
