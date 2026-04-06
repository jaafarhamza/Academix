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
import type { Room } from "@/modules/room/types/room.types";
import type { Student } from "@/modules/student/types/student.types";
import type { StudentGroup } from "@/modules/student-group/types/student-group.types";
import type { Subject } from "@/modules/subject/types/subject.types";
import type { Teacher } from "@/modules/teacher/types/teacher.types";
import type { TeacherSubjectAssignment } from "@/modules/teacher-subject/types/teacher-subject.types";
import { CourseSessionClientError } from "../client/course-session-client";
import type {
  CourseSessionConflict,
  CourseSessionCreatePayload,
  CourseSessionDay,
} from "../types/course-session.types";

type SessionTargetType = "group" | "student";

type SessionFormState = {
  teacherId: string;
  subjectId: string;
  targetType: SessionTargetType;
  studentGroupId: string;
  studentId: string;
  roomId: string;
  day: CourseSessionDay;
  startTime: string;
  endTime: string;
};

type SessionFormErrors = Partial<{
  teacherId: string;
  subjectId: string;
  target: string;
  roomId: string;
  schedule: string;
  form: string;
}>;

type SelectOption = {
  value: string;
  label: string;
};

type CourseSessionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  studentGroups: StudentGroup[];
  students: Student[];
  teacherSubjects: TeacherSubjectAssignment[];
  onCreate: (payload: CourseSessionCreatePayload) => Promise<void>;
};

const sessionDayOptions: Array<{ value: CourseSessionDay; label: string }> = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const emptyFormState: SessionFormState = {
  teacherId: "",
  subjectId: "",
  targetType: "group",
  studentGroupId: "",
  studentId: "",
  roomId: "",
  day: "MONDAY",
  startTime: "08:00",
  endTime: "09:00",
};

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

function getTeacherName(teacher: Teacher) {
  return `${teacher.firstName} ${teacher.lastName}`.trim();
}

function getStudentName(student: Student) {
  return `${student.firstName} ${student.lastName}`.trim();
}

function buildTeacherOptions(teachers: Teacher[]): SelectOption[] {
  return [...teachers]
    .map((teacher) => ({
      value: teacher.id,
      label: getTeacherName(teacher),
    }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
    );
}

function buildAllSubjectOptions(subjects: Subject[]): SelectOption[] {
  return [...subjects]
    .map((subject) => ({
      value: subject.id,
      label: subject.name,
    }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
    );
}

function buildSubjectOptionsByTeacher(
  teacherSubjects: TeacherSubjectAssignment[],
) {
  const map = new Map<string, SelectOption[]>();

  for (const assignment of teacherSubjects) {
    const currentOptions = map.get(assignment.teacher_id) ?? [];
    if (!currentOptions.some((option) => option.value === assignment.subject_id)) {
      currentOptions.push({
        value: assignment.subject_id,
        label: assignment.subject.name,
      });
    }

    map.set(assignment.teacher_id, currentOptions);
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

function buildRoomOptions(rooms: Room[]): SelectOption[] {
  return [...rooms]
    .map((room) => ({
      value: room.id,
      label: `${room.roomName} (Floor ${room.floor})`,
    }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
    );
}

function buildStudentOptions(students: Student[]): SelectOption[] {
  return [...students]
    .map((student) => ({
      value: student.id,
      label: getStudentName(student),
    }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
    );
}

function buildGroupOptions(
  studentGroups: StudentGroup[],
  teacherSubjects: TeacherSubjectAssignment[],
  teacherId: string,
  subjectId: string,
): SelectOption[] {
  if (!teacherId || !subjectId) {
    return [];
  }

  const matchingTeacherSubjectIds = new Set(
    teacherSubjects
      .filter(
        (assignment) =>
          assignment.teacher_id === teacherId && assignment.subject_id === subjectId,
      )
      .map((assignment) => assignment.id),
  );

  if (matchingTeacherSubjectIds.size === 0) {
    return [];
  }

  return studentGroups
    .filter((group) => matchingTeacherSubjectIds.has(group.teacher_subject_id))
    .map((group) => ({
      value: group.id,
      label: group.name,
    }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
    );
}

function buildInitialFormState(
  teacherOptions: SelectOption[],
  subjectOptionsByTeacher: Map<string, SelectOption[]>,
  allSubjectOptions: SelectOption[],
  roomOptions: SelectOption[],
  groupOptions: SelectOption[],
  studentOptions: SelectOption[],
): SessionFormState {
  const teacherId = teacherOptions[0]?.value ?? "";
  const subjectOptions = teacherId
    ? (subjectOptionsByTeacher.get(teacherId) ?? allSubjectOptions)
    : allSubjectOptions;
  const subjectId = subjectOptions[0]?.value ?? "";
  const targetType = groupOptions.length > 0 || studentOptions.length === 0 ? "group" : "student";

  return {
    ...emptyFormState,
    teacherId,
    subjectId,
    targetType,
    studentGroupId: targetType === "group" ? (groupOptions[0]?.value ?? "") : "",
    studentId: targetType === "student" ? (studentOptions[0]?.value ?? "") : "",
    roomId: roomOptions[0]?.value ?? "",
  };
}

function buildCreatePayload(form: SessionFormState): CourseSessionCreatePayload {
  const teacherId = form.teacherId.trim();
  const subjectId = form.subjectId.trim();
  const roomId = form.roomId.trim();
  const startTime = form.startTime.trim();
  const endTime = form.endTime.trim();

  if (!teacherId) {
    throw new Error("Teacher is required.");
  }

  if (!subjectId) {
    throw new Error("Subject is required.");
  }

  if (!roomId) {
    throw new Error("Room is required.");
  }

  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    throw new Error("Start and end times must use HH:mm format.");
  }

  if (endTime <= startTime) {
    throw new Error("End time must be after start time.");
  }

  if (form.targetType === "group") {
    const studentGroupId = form.studentGroupId.trim();
    if (!studentGroupId) {
      throw new Error("Student group is required for group sessions.");
    }

    return {
      teacherId,
      subjectId,
      roomId,
      day: form.day,
      startTime,
      endTime,
      studentGroupId,
    };
  }

  const studentId = form.studentId.trim();
  if (!studentId) {
    throw new Error("Student is required for private sessions.");
  }

  return {
    teacherId,
    subjectId,
    roomId,
    day: form.day,
    startTime,
    endTime,
    studentId,
  };
}

function buildValidationErrors(form: SessionFormState): SessionFormErrors {
  const errors: SessionFormErrors = {};

  if (!form.teacherId.trim()) {
    errors.teacherId = "Teacher is required.";
  }

  if (!form.subjectId.trim()) {
    errors.subjectId = "Subject is required.";
  }

  if (!form.roomId.trim()) {
    errors.roomId = "Room is required.";
  }

  if (!/^\d{2}:\d{2}$/.test(form.startTime.trim())) {
    errors.schedule = "Start time must use HH:mm format.";
  } else if (!/^\d{2}:\d{2}$/.test(form.endTime.trim())) {
    errors.schedule = "End time must use HH:mm format.";
  } else if (form.endTime.trim() <= form.startTime.trim()) {
    errors.schedule = "End time must be after start time.";
  }

  if (form.targetType === "group") {
    if (!form.studentGroupId.trim()) {
      errors.target = "Student group is required for group sessions.";
    }
  } else if (!form.studentId.trim()) {
    errors.target = "Student is required for private sessions.";
  }

  return errors;
}

function mapConflictToFormErrors(conflicts: CourseSessionConflict[]): SessionFormErrors {
  const errors: SessionFormErrors = {};

  for (const conflict of conflicts) {
    if (conflict.type === "TEACHER_TIME_OVERLAP" && !errors.teacherId) {
      errors.teacherId = conflict.message;
      continue;
    }

    if (conflict.type === "ROOM_TIME_OVERLAP" && !errors.roomId) {
      errors.roomId = conflict.message;
      continue;
    }

    if (conflict.type === "STUDENT_TIME_OVERLAP" && !errors.target) {
      errors.target = conflict.message;
    }
  }

  return errors;
}

function buildErrorState(error: unknown): SessionFormErrors {
  if (error instanceof CourseSessionClientError) {
    const conflictErrors = mapConflictToFormErrors(error.conflicts);
    const hasInlineConflictError = Object.keys(conflictErrors).length > 0;
    return {
      ...conflictErrors,
      form: hasInlineConflictError ? undefined : error.message,
    };
  }

  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "Unable to create session right now.";
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("teacher")) {
    return {
      teacherId: message,
    };
  }

  if (normalizedMessage.includes("subject")) {
    return {
      subjectId: message,
    };
  }

  if (normalizedMessage.includes("room")) {
    return {
      roomId: message,
    };
  }

  if (
    normalizedMessage.includes("student") ||
    normalizedMessage.includes("group") ||
    normalizedMessage.includes("target")
  ) {
    return {
      target: message,
    };
  }

  if (normalizedMessage.includes("time")) {
    return {
      schedule: message,
    };
  }

  return {
    form: message,
  };
}

function renderFieldError(message: string | undefined) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export function CourseSessionFormDialog({
  open,
  onOpenChange,
  teachers,
  subjects,
  rooms,
  studentGroups,
  students,
  teacherSubjects,
  onCreate,
}: CourseSessionFormDialogProps) {
  const teacherOptions = useMemo(() => buildTeacherOptions(teachers), [teachers]);
  const allSubjectOptions = useMemo(
    () => buildAllSubjectOptions(subjects),
    [subjects],
  );
  const subjectOptionsByTeacher = useMemo(
    () => buildSubjectOptionsByTeacher(teacherSubjects),
    [teacherSubjects],
  );
  const roomOptions = useMemo(() => buildRoomOptions(rooms), [rooms]);
  const studentOptions = useMemo(() => buildStudentOptions(students), [students]);

  const [form, setForm] = useState<SessionFormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<SessionFormErrors>({});

  const availableSubjectOptions = useMemo(() => {
    if (!form.teacherId) {
      return allSubjectOptions;
    }

    return subjectOptionsByTeacher.get(form.teacherId) ?? allSubjectOptions;
  }, [allSubjectOptions, form.teacherId, subjectOptionsByTeacher]);

  const availableGroupOptions = useMemo(
    () =>
      buildGroupOptions(
        studentGroups,
        teacherSubjects,
        form.teacherId,
        form.subjectId,
      ),
    [form.subjectId, form.teacherId, studentGroups, teacherSubjects],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const initialTeacherId = teacherOptions[0]?.value ?? "";
    const initialSubjectOptions = initialTeacherId
      ? (subjectOptionsByTeacher.get(initialTeacherId) ?? allSubjectOptions)
      : allSubjectOptions;
    const initialSubjectId = initialSubjectOptions[0]?.value ?? "";
    const initialGroupOptions = buildGroupOptions(
      studentGroups,
      teacherSubjects,
      initialTeacherId,
      initialSubjectId,
    );

    setForm(
      buildInitialFormState(
        teacherOptions,
        subjectOptionsByTeacher,
        allSubjectOptions,
        roomOptions,
        initialGroupOptions,
        studentOptions,
      ),
    );
    setErrors({});
  }, [
    allSubjectOptions,
    open,
    roomOptions,
    studentGroups,
    studentOptions,
    subjectOptionsByTeacher,
    teacherOptions,
    teacherSubjects,
  ]);

  useEffect(() => {
    if (availableSubjectOptions.some((option) => option.value === form.subjectId)) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      subjectId: availableSubjectOptions[0]?.value ?? "",
    }));
  }, [availableSubjectOptions, form.subjectId]);

  useEffect(() => {
    if (form.targetType !== "group") {
      return;
    }

    if (availableGroupOptions.some((option) => option.value === form.studentGroupId)) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      studentGroupId: availableGroupOptions[0]?.value ?? "",
    }));
  }, [availableGroupOptions, form.studentGroupId, form.targetType]);

  useEffect(() => {
    if (form.targetType !== "student") {
      return;
    }

    if (studentOptions.some((option) => option.value === form.studentId)) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      studentId: studentOptions[0]?.value ?? "",
    }));
  }, [form.studentId, form.targetType, studentOptions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const validationErrors = buildValidationErrors(form);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      const payload = buildCreatePayload(form);
      await onCreate(payload);
      onOpenChange(false);
    } catch (error: unknown) {
      setErrors(buildErrorState(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Session</DialogTitle>
          <DialogDescription>
            Schedule a group or private session with teacher, subject, room, and
            weekly time details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Teacher</span>
              <select
                value={form.teacherId}
                onChange={(event) => {
                  const teacherId = event.currentTarget.value;
                  setErrors((previous) => ({
                    ...previous,
                    teacherId: undefined,
                    subjectId: undefined,
                    target: undefined,
                    form: undefined,
                  }));
                  setForm((previous) => ({
                    ...previous,
                    teacherId,
                    subjectId: "",
                    studentGroupId: "",
                  }));
                }}
                className={selectClassName}
                required
              >
                <option value="">Select teacher</option>
                {teacherOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {renderFieldError(errors.teacherId)}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Subject</span>
              <select
                value={form.subjectId}
                onChange={(event) => {
                  const subjectId = event.currentTarget.value;
                  setErrors((previous) => ({
                    ...previous,
                    subjectId: undefined,
                    target: undefined,
                    form: undefined,
                  }));
                  setForm((previous) => ({
                    ...previous,
                    subjectId,
                    studentGroupId: "",
                  }));
                }}
                className={selectClassName}
                required
              >
                <option value="">Select subject</option>
                {availableSubjectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {renderFieldError(errors.subjectId)}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium">Session type</span>
              <select
                value={form.targetType}
                onChange={(event) => {
                  const targetType = event.currentTarget.value as SessionTargetType;
                  setErrors((previous) => ({
                    ...previous,
                    target: undefined,
                    form: undefined,
                  }));
                  setForm((previous) => ({
                    ...previous,
                    targetType,
                    studentGroupId:
                      targetType === "group"
                        ? (availableGroupOptions[0]?.value ?? "")
                        : "",
                    studentId:
                      targetType === "student"
                        ? (studentOptions[0]?.value ?? "")
                        : "",
                  }));
                }}
                className={selectClassName}
              >
                <option value="group">Group session</option>
                <option value="student">Private session</option>
              </select>
            </label>

            {form.targetType === "group" ? (
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium">Student group</span>
                <select
                  value={form.studentGroupId}
                  onChange={(event) => {
                    const studentGroupId = event.currentTarget.value;
                    setErrors((previous) => ({
                      ...previous,
                      target: undefined,
                      form: undefined,
                    }));
                    setForm((previous) => ({
                      ...previous,
                      studentGroupId,
                    }));
                  }}
                  className={selectClassName}
                  required
                >
                  <option value="">Select group</option>
                  {availableGroupOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {availableGroupOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No groups match the selected teacher and subject.
                  </p>
                ) : null}
                {renderFieldError(errors.target)}
              </label>
            ) : (
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sm font-medium">Student</span>
                <select
                  value={form.studentId}
                  onChange={(event) => {
                    const studentId = event.currentTarget.value;
                    setErrors((previous) => ({
                      ...previous,
                      target: undefined,
                      form: undefined,
                    }));
                    setForm((previous) => ({
                      ...previous,
                      studentId,
                    }));
                  }}
                  className={selectClassName}
                  required
                >
                  <option value="">Select student</option>
                  {studentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {renderFieldError(errors.target)}
              </label>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium">Room</span>
              <select
                value={form.roomId}
                onChange={(event) => {
                  const roomId = event.currentTarget.value;
                  setErrors((previous) => ({
                    ...previous,
                    roomId: undefined,
                    form: undefined,
                  }));
                  setForm((previous) => ({
                    ...previous,
                    roomId,
                  }));
                }}
                className={selectClassName}
                required
              >
                <option value="">Select room</option>
                {roomOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {renderFieldError(errors.roomId)}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Day</span>
              <select
                value={form.day}
                onChange={(event) => {
                  const day = event.currentTarget.value as CourseSessionDay;
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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

          {renderFieldError(errors.schedule)}

          {errors.form ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.form}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
