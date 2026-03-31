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
import type { TeacherSubjectAssignment } from "@/modules/teacher-subject/types/teacher-subject.types";
import type {
  StudentGroup,
  StudentGroupCreatePayload,
  StudentGroupUpdatePayload,
} from "../types/student-group.types";
import {
  getSchoolYearOptionsForCycle,
  parseSchoolCycle,
  parseSchoolYear,
  schoolCycleOptions,
  isSchoolYearAllowedForCycle,
} from "../constants/student-group-level";

type StudentGroupFormMode = "create" | "edit";

type StudentGroupFormState = {
  teacherId: string;
  subjectId: string;
  schoolCycle: string;
  schoolYear: string;
  name: string;
};

const emptyFormState: StudentGroupFormState = {
  teacherId: "",
  subjectId: "",
  schoolCycle: "PRIMARY",
  schoolYear: "FIRST_YEAR",
  name: "",
};

type TeacherOption = {
  id: string;
  label: string;
};

type SubjectOption = {
  id: string;
  label: string;
};

type StudentGroupFormDialogProps = {
  mode: StudentGroupFormMode;
  studentGroup: StudentGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherSubjects: TeacherSubjectAssignment[];
  onCreate: (payload: StudentGroupCreatePayload) => Promise<void>;
  onUpdate: (
    studentGroupId: string,
    payload: StudentGroupUpdatePayload,
  ) => Promise<void>;
};

function getTeacherLabel(assignment: TeacherSubjectAssignment) {
  return `${assignment.teacher.firstName} ${assignment.teacher.lastName}`.trim();
}

function buildTeacherOptions(
  teacherSubjects: TeacherSubjectAssignment[],
): TeacherOption[] {
  const map = new Map<string, TeacherOption>();

  for (const assignment of teacherSubjects) {
    if (!map.has(assignment.teacher_id)) {
      map.set(assignment.teacher_id, {
        id: assignment.teacher_id,
        label: getTeacherLabel(assignment),
      });
    }
  }

  return [...map.values()].sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
  );
}

function buildSubjectOptionsByTeacher(
  teacherSubjects: TeacherSubjectAssignment[],
) {
  const map = new Map<string, SubjectOption[]>();

  for (const assignment of teacherSubjects) {
    const current = map.get(assignment.teacher_id) ?? [];
    if (!current.some((subject) => subject.id === assignment.subject_id)) {
      current.push({
        id: assignment.subject_id,
        label: assignment.subject.name,
      });
    }
    map.set(assignment.teacher_id, current);
  }

  for (const [teacherId, options] of map.entries()) {
    map.set(
      teacherId,
      [...options].sort((left, right) =>
        left.label.localeCompare(right.label, undefined, {
          sensitivity: "base",
        }),
      ),
    );
  }

  return map;
}

function toCreateFormState(
  teacherOptions: TeacherOption[],
  subjectOptionsByTeacher: Map<string, SubjectOption[]>,
): StudentGroupFormState {
  const teacherId = teacherOptions[0]?.id ?? "";
  const subjectId = teacherId
    ? (subjectOptionsByTeacher.get(teacherId)?.[0]?.id ?? "")
    : "";

  return {
    ...emptyFormState,
    teacherId,
    subjectId,
  };
}

function toEditFormState(
  studentGroup: StudentGroup,
  teacherOptions: TeacherOption[],
  subjectOptionsByTeacher: Map<string, SubjectOption[]>,
  teacherSubjects: TeacherSubjectAssignment[],
): StudentGroupFormState {
  const selectedAssignment =
    teacherSubjects.find(
      (assignment) => assignment.id === studentGroup.teacher_subject_id,
    ) ?? null;

  const teacherId = selectedAssignment?.teacher_id ?? teacherOptions[0]?.id ?? "";
  const subjectOptions = subjectOptionsByTeacher.get(teacherId) ?? [];
  const subjectId = selectedAssignment?.subject_id ?? subjectOptions[0]?.id ?? "";

  return {
    teacherId,
    subjectId,
    schoolCycle: studentGroup.schoolCycle,
    schoolYear: studentGroup.schoolYear,
    name: studentGroup.name,
  };
}

export function StudentGroupFormDialog({
  mode,
  studentGroup,
  open,
  onOpenChange,
  teacherSubjects,
  onCreate,
  onUpdate,
}: StudentGroupFormDialogProps) {
  const teacherOptions = useMemo(
    () => buildTeacherOptions(teacherSubjects),
    [teacherSubjects],
  );

  const subjectOptionsByTeacher = useMemo(
    () => buildSubjectOptionsByTeacher(teacherSubjects),
    [teacherSubjects],
  );

  const [form, setForm] = useState<StudentGroupFormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEditMode = mode === "edit";

  const selectedCycle = parseSchoolCycle(form.schoolCycle);

  const availableSubjectOptions = useMemo(
    () => subjectOptionsByTeacher.get(form.teacherId) ?? [],
    [form.teacherId, subjectOptionsByTeacher],
  );

  const availableYearOptions = useMemo(
    () => getSchoolYearOptionsForCycle(selectedCycle),
    [selectedCycle],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEditMode) {
      if (!studentGroup) {
        return;
      }

      setForm(
        toEditFormState(
          studentGroup,
          teacherOptions,
          subjectOptionsByTeacher,
          teacherSubjects,
        ),
      );
    } else {
      setForm(toCreateFormState(teacherOptions, subjectOptionsByTeacher));
    }

    setErrorMessage(null);
  }, [
    isEditMode,
    open,
    studentGroup,
    subjectOptionsByTeacher,
    teacherOptions,
    teacherSubjects,
  ]);

  useEffect(() => {
    if (!form.teacherId) {
      if (form.subjectId) {
        setForm((previous) => ({
          ...previous,
          subjectId: "",
        }));
      }
      return;
    }

    if (availableSubjectOptions.some((subject) => subject.id === form.subjectId)) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      subjectId: availableSubjectOptions[0]?.id ?? "",
    }));
  }, [availableSubjectOptions, form.subjectId, form.teacherId]);

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

    if (
      selectedSchoolYear &&
      isSchoolYearAllowedForCycle(selectedCycle, selectedSchoolYear)
    ) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      schoolYear: availableYearOptions[0]?.[0] ?? "",
    }));
  }, [availableYearOptions, form.schoolYear, selectedCycle]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const schoolCycle = parseSchoolCycle(form.schoolCycle);
      const schoolYear = parseSchoolYear(form.schoolYear);
      const teacherId = form.teacherId.trim();
      const subjectId = form.subjectId.trim();

      if (!teacherId || !subjectId || !schoolCycle || !schoolYear) {
        throw new Error("Teacher, subject, cycle, and year are required.");
      }

      if (!isSchoolYearAllowedForCycle(schoolCycle, schoolYear)) {
        throw new Error("Selected school year is not valid for this cycle.");
      }

      const assignment = teacherSubjects.find(
        (row) => row.teacher_id === teacherId && row.subject_id === subjectId,
      );

      if (!assignment) {
        throw new Error("Teacher-subject assignment was not found.");
      }

      const normalizedName = form.name.trim();
      if (isEditMode) {
        if (!studentGroup) {
          throw new Error("Student group context is missing.");
        }

        const payload: StudentGroupUpdatePayload = {};

        if (assignment.id !== studentGroup.teacher_subject_id) {
          payload.teacherSubjectId = assignment.id;
        }
        if (schoolCycle !== studentGroup.schoolCycle) {
          payload.schoolCycle = schoolCycle;
        }
        if (schoolYear !== studentGroup.schoolYear) {
          payload.schoolYear = schoolYear;
        }
        if (normalizedName && normalizedName !== studentGroup.name) {
          payload.name = normalizedName;
        }

        if (Object.keys(payload).length === 0) {
          throw new Error("No fields changed.");
        }

        await onUpdate(studentGroup.id, payload);
      } else {
        await onCreate({
          teacherSubjectId: assignment.id,
          schoolCycle,
          schoolYear,
          ...(normalizedName ? { name: normalizedName } : {}),
        });
      }

      onOpenChange(false);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to submit student group form right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasTeacherSubjectAssignments = teacherSubjects.length > 0;
  const title = isEditMode ? "Edit Student Group" : "Create Student Group";
  const description = isEditMode
    ? "Update group assignment, cycle, year, and name."
    : "Select teacher and subject assignment, then set cycle and year.";

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
              <span className="text-sm font-medium">Teacher</span>
              <select
                value={form.teacherId}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((previous) => ({
                    ...previous,
                    teacherId: value,
                  }));
                }}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                disabled={isSubmitting || !hasTeacherSubjectAssignments}
                required
              >
                {teacherOptions.length === 0 ? (
                  <option value="">No assigned teachers</option>
                ) : (
                  teacherOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.label}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Subject</span>
              <select
                value={form.subjectId}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((previous) => ({
                    ...previous,
                    subjectId: value,
                  }));
                }}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                disabled={isSubmitting || !hasTeacherSubjectAssignments}
                required
              >
                {availableSubjectOptions.length === 0 ? (
                  <option value="">No assigned subjects</option>
                ) : (
                  availableSubjectOptions.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.label}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

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
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                disabled={isSubmitting}
                required
              >
                {schoolCycleOptions.map(([schoolCycle, label]) => (
                  <option key={schoolCycle} value={schoolCycle}>
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
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                disabled={isSubmitting}
                required
              >
                {availableYearOptions.map(([schoolYear, label]) => (
                  <option key={schoolYear} value={schoolYear}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium">Group name (optional)</span>
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
              placeholder="Leave empty to auto-generate from teacher and subject"
              disabled={isSubmitting}
            />
          </label>

          {!hasTeacherSubjectAssignments ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              No teacher-subject assignments found. Create assignments first.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          <DialogFooter className="mt-4">
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
              disabled={isSubmitting || !hasTeacherSubjectAssignments}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {isEditMode ? "Saving..." : "Creating..."}
                </>
              ) : (
                isEditMode ? (
                  <>
                    <PencilLine className="size-4" />
                    Save changes
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Create group
                  </>
                )
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
