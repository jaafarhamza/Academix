"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
import { listStudents } from "@/modules/student/client/student-client";
import type { Student } from "@/modules/student/types/student.types";
import { getStudentGroupDetail } from "@/modules/student-group/client/student-group-client";
import type {
  StudentGroup,
  StudentGroupDetail,
} from "@/modules/student-group/types/student-group.types";
import type { PaymentCreatePayload } from "../types/payment.types";

type PaymentRecordFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentGroups: StudentGroup[];
  onCreate: (payload: PaymentCreatePayload) => Promise<void>;
};

type PaymentFormState = {
  studentGroupId: string;
  studentId: string;
  amount: string;
};

type PaymentFormErrors = Partial<{
  studentGroupId: string;
  studentId: string;
  amount: string;
  form: string;
}>;

const emptyFormState: PaymentFormState = {
  studentGroupId: "",
  studentId: "",
  amount: "",
};

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70";

function getStudentName(student: Student) {
  return `${student.firstName} ${student.lastName}`.trim();
}

function buildValidationErrors(form: PaymentFormState): PaymentFormErrors {
  const errors: PaymentFormErrors = {};

  if (!form.studentGroupId.trim()) {
    errors.studentGroupId = "Student group is required.";
  }

  if (!form.studentId.trim()) {
    errors.studentId = "Student is required.";
  }

  const amount = Number(form.amount);
  if (!form.amount.trim()) {
    errors.amount = "Amount is required.";
  } else if (!Number.isFinite(amount) || amount < 0) {
    errors.amount = "Amount must be a valid number greater than or equal to 0.";
  }

  return errors;
}

function renderFieldError(message: string | undefined) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export function PaymentRecordFormDialog({
  open,
  onOpenChange,
  studentGroups,
  onCreate,
}: PaymentRecordFormDialogProps) {
  const [form, setForm] = useState<PaymentFormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingGroupData, setIsLoadingGroupData] = useState(false);
  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<StudentGroupDetail | null>(null);
  const studentsByGroupIdRef = useRef<Record<string, Student[]>>({});
  const groupDetailByIdRef = useRef<Record<string, StudentGroupDetail>>({});

  const groupOptions = useMemo(
    () =>
      [...studentGroups].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, {
          sensitivity: "base",
        }),
      ),
    [studentGroups],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setErrors({});
    setSelectedGroupDetail(null);
    setAvailableStudents([]);
    setForm({
      studentGroupId: groupOptions[0]?.id ?? "",
      studentId: "",
      amount: "",
    });
  }, [groupOptions, open]);

  useEffect(() => {
    if (!open || !form.studentGroupId) {
      return;
    }

    let isCancelled = false;

    async function loadGroupContext() {
      setIsLoadingGroupData(true);
      try {
        const cachedGroupDetail = groupDetailByIdRef.current[form.studentGroupId];
        const cachedStudents = studentsByGroupIdRef.current[form.studentGroupId];
        const [groupDetail, students] = await Promise.all([
          cachedGroupDetail
            ? Promise.resolve(cachedGroupDetail)
            : getStudentGroupDetail(form.studentGroupId),
          cachedStudents
            ? Promise.resolve(cachedStudents)
            : listStudents({
                groupId: form.studentGroupId,
                isActive: true,
                page: 1,
                limit: 100,
              }),
        ]);

        if (isCancelled) {
          return;
        }

        groupDetailByIdRef.current[form.studentGroupId] = groupDetail;
        studentsByGroupIdRef.current[form.studentGroupId] = students;
        setSelectedGroupDetail(groupDetail);
        setAvailableStudents(students);
        setForm((previous) => {
          const nextStudentId = students.some(
            (student) => student.id === previous.studentId,
          )
            ? previous.studentId
            : (students[0]?.id ?? "");

          return {
            ...previous,
            studentId: nextStudentId,
          };
        });
      } catch (error: unknown) {
        if (isCancelled) {
          return;
        }

        setErrors((previous) => ({
          ...previous,
          form:
            error instanceof Error && error.message.trim().length > 0
              ? error.message
              : "Unable to load payment form options right now.",
        }));
      } finally {
        if (!isCancelled) {
          setIsLoadingGroupData(false);
        }
      }
    }

    void loadGroupContext();

    return () => {
      isCancelled = true;
    };
  }, [form.studentGroupId, open]);

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

    if (!selectedGroupDetail?.teacherId) {
      setErrors({
        form: "Selected group is missing teacher information.",
      });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await onCreate({
        student_id: form.studentId.trim(),
        teacher_id: selectedGroupDetail.teacherId,
        student_group_id: form.studentGroupId.trim(),
        amount: Number(Number(form.amount).toFixed(2)),
      });

      onOpenChange(false);
    } catch (error: unknown) {
      setErrors({
        form:
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Unable to record payment right now.",
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
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Select a group, choose one enrolled student, and enter the collected amount.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <label className="space-y-2">
            <span className="text-sm font-medium">Student group</span>
            <select
              className={selectClassName}
              value={form.studentGroupId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((previous) => ({
                  ...previous,
                  studentGroupId: value,
                  studentId: "",
                }));
                setErrors((previous) => ({
                  ...previous,
                  studentGroupId: undefined,
                  studentId: undefined,
                  form: undefined,
                }));
              }}
              disabled={isSubmitting || groupOptions.length === 0}
            >
              {groupOptions.map((group) => (
                <option
                  key={group.id}
                  value={group.id}
                >
                  {group.name}
                </option>
              ))}
            </select>
            {renderFieldError(errors.studentGroupId)}
          </label>

          {selectedGroupDetail ? (
            <div className="rounded-xl border bg-muted/35 p-3 text-sm">
              <p className="font-medium text-foreground">{selectedGroupDetail.teacherName}</p>
              <p className="text-muted-foreground">
                {selectedGroupDetail.subjectName} • {selectedGroupDetail.studentNumbers}{" "}
                students
              </p>
            </div>
          ) : null}

          <label className="space-y-2">
            <span className="text-sm font-medium">Student</span>
            <select
              className={selectClassName}
              value={form.studentId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((previous) => ({
                  ...previous,
                  studentId: value,
                }));
                setErrors((previous) => ({
                  ...previous,
                  studentId: undefined,
                  form: undefined,
                }));
              }}
              disabled={isSubmitting || isLoadingGroupData || availableStudents.length === 0}
            >
              {availableStudents.length === 0 ? (
                <option value="">
                  {isLoadingGroupData
                    ? "Loading enrolled students..."
                    : "No enrolled students available"}
                </option>
              ) : null}
              {availableStudents.map((student) => (
                <option
                  key={student.id}
                  value={student.id}
                >
                  {getStudentName(student)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Student choices are limited to active enrollments in the selected group.
            </p>
            {renderFieldError(errors.studentId)}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Amount</span>
            <Input
              type="number"
              min="0"
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
            {renderFieldError(errors.amount)}
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
              disabled={
                isSubmitting ||
                isLoadingGroupData ||
                groupOptions.length === 0 ||
                availableStudents.length === 0
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" />
                  Record payment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
