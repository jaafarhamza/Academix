"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppAuth, useToast } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import { listSubjects } from "@/modules/subject/client/subject-client";
import { listTeachers } from "@/modules/teacher/client/teacher-client";
import type { Subject } from "@/modules/subject/types/subject.types";
import type { Teacher } from "@/modules/teacher/types/teacher.types";
import {
  createTeacherSubject,
  deleteTeacherSubject,
  listTeacherSubjects,
} from "../client/teacher-subject-client";
import { TeacherSubjectRemoveDialog } from "./teacher-subject-remove-dialog";
import type { TeacherSubjectAssignment } from "../types/teacher-subject.types";

type AssignmentListState = {
  isLoading: boolean;
  errorMessage: string | null;
  items: TeacherSubjectAssignment[];
};

const initialAssignmentListState: AssignmentListState = {
  isLoading: true,
  errorMessage: null,
  items: [],
};

const defaultPage = 1;
const defaultLimit = 10;
const limitOptions = [10, 20, 50];

function parsePositiveInteger(value: string | null, fallbackValue: number) {
  if (!value) {
    return fallbackValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return parsed;
}

function extractErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

function getTeacherName(teacher: Pick<Teacher, "firstName" | "lastName">) {
  return `${teacher.firstName} ${teacher.lastName}`.trim();
}

function normalizeId(value: string | null) {
  if (!value) {
    return "";
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : "";
}

export function TeacherSubjectAssignmentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, setUser, clearUser } = useAppAuth();
  const toast = useToast();

  const teacherFilterId = normalizeId(searchParams.get("teacherId"));
  const subjectFilterId = normalizeId(searchParams.get("subjectId"));
  const page = parsePositiveInteger(searchParams.get("page"), defaultPage);
  const rawLimit = parsePositiveInteger(searchParams.get("limit"), defaultLimit);
  const limit = limitOptions.includes(rawLimit) ? rawLimit : defaultLimit;

  const [isSessionReady, setIsSessionReady] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isReferenceLoading, setIsReferenceLoading] = useState(true);
  const [referenceErrorMessage, setReferenceErrorMessage] = useState<string | null>(null);
  const [assignmentState, setAssignmentState] = useState<AssignmentListState>(
    initialAssignmentListState,
  );

  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [selectedTeacherAssignedSubjectIds, setSelectedTeacherAssignedSubjectIds] =
    useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<TeacherSubjectAssignment | null>(
    null,
  );

  useEffect(() => {
    if (user?.role === "ADMIN") {
      setIsSessionReady(true);
      return;
    }

    let isCancelled = false;

    async function initializeCenterSession() {
      try {
        const session = await ensureCenterSession();
        if (isCancelled) {
          return;
        }

        setUser({
          id: session.auth.center.id,
          centerId: session.auth.center.id,
          role: "ADMIN",
          fullName: session.profile?.centerName ?? session.auth.center.centerName,
          email: session.auth.center.email,
        });
        setIsSessionReady(true);
      } catch {
        if (isCancelled) {
          return;
        }

        clearUser();
        setIsSessionReady(false);
        router.replace("/center/login");
      }
    }

    void initializeCenterSession();

    return () => {
      isCancelled = true;
    };
  }, [clearUser, router, setUser, user?.role]);

  const replaceQueryParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      mutate(nextParams);

      const currentQuery = searchParams.toString();
      const nextQuery = nextParams.toString();
      if (nextQuery === currentQuery) {
        return;
      }

      const target = nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const loadReferenceData = useCallback(async () => {
    setIsReferenceLoading(true);
    setReferenceErrorMessage(null);

    try {
      const [teacherRows, subjectRows] = await Promise.all([
        listTeachers({
          isActive: true,
          page: 1,
          limit: 100,
        }),
        listSubjects({
          page: 1,
          limit: 100,
        }),
      ]);

      const sortedTeachers = [...teacherRows].sort((left, right) =>
        getTeacherName(left).localeCompare(getTeacherName(right), undefined, {
          sensitivity: "base",
        }),
      );

      const sortedSubjects = [...subjectRows].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, {
          sensitivity: "base",
        }),
      );

      setTeachers(sortedTeachers);
      setSubjects(sortedSubjects);
      setSelectedTeacherId((previous) => {
        if (previous && sortedTeachers.some((teacher) => teacher.id === previous)) {
          return previous;
        }

        if (
          teacherFilterId &&
          sortedTeachers.some((teacher) => teacher.id === teacherFilterId)
        ) {
          return teacherFilterId;
        }

        return sortedTeachers[0]?.id ?? "";
      });
      setIsReferenceLoading(false);
    } catch (error: unknown) {
      setReferenceErrorMessage(
        extractErrorMessage(error, "Unable to load teachers and subjects."),
      );
      setIsReferenceLoading(false);
    }
  }, [teacherFilterId]);

  const loadAssignments = useCallback(async () => {
    setAssignmentState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const assignments = await listTeacherSubjects({
        teacherId: teacherFilterId || undefined,
        subjectId: subjectFilterId || undefined,
        page,
        limit,
      });

      setAssignmentState({
        isLoading: false,
        errorMessage: null,
        items: assignments,
      });
    } catch (error: unknown) {
      setAssignmentState({
        isLoading: false,
        errorMessage: extractErrorMessage(
          error,
          "Unable to load teacher-subject assignments.",
        ),
        items: [],
      });
    }
  }, [limit, page, subjectFilterId, teacherFilterId]);

  const loadTeacherAssignedSubjects = useCallback(
    async (teacherId: string) => {
      if (!teacherId) {
        setSelectedTeacherAssignedSubjectIds([]);
        return;
      }

      try {
        const assignments = await listTeacherSubjects({
          teacherId,
          page: 1,
          limit: 100,
        });

        setSelectedTeacherAssignedSubjectIds(
          assignments.map((assignment) => assignment.subject_id),
        );
      } catch {
        setSelectedTeacherAssignedSubjectIds([]);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void loadReferenceData();
  }, [isSessionReady, loadReferenceData]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void loadAssignments();
  }, [isSessionReady, loadAssignments]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    setSelectedSubjectIds([]);
    void loadTeacherAssignedSubjects(selectedTeacherId);
  }, [isSessionReady, loadTeacherAssignedSubjects, selectedTeacherId]);

  const visibleSubjects = useMemo(() => {
    const normalizedSearch = subjectSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return subjects;
    }

    return subjects.filter((subject) =>
      subject.name.toLowerCase().includes(normalizedSearch),
    );
  }, [subjectSearch, subjects]);

  const selectedTeacher = teachers.find(
    (teacher) => teacher.id === selectedTeacherId,
  );

  const hasPreviousPage = page > 1;
  const hasNextPage = assignmentState.items.length === limit;
  const assignedSet = useMemo(
    () => new Set(selectedTeacherAssignedSubjectIds),
    [selectedTeacherAssignedSubjectIds],
  );

  const handleSubjectToggle = useCallback(
    (subjectId: string, isChecked: boolean) => {
      if (assignedSet.has(subjectId)) {
        return;
      }

      setSelectedSubjectIds((previous) => {
        if (isChecked) {
          if (previous.includes(subjectId)) {
            return previous;
          }

          return [...previous, subjectId];
        }

        return previous.filter((currentSubjectId) => currentSubjectId !== subjectId);
      });
    },
    [assignedSet],
  );

  const handleAssignSelected = useCallback(async () => {
    if (!selectedTeacherId) {
      toast.info("Select a teacher", "Choose a teacher before assigning subjects.");
      return;
    }

    if (selectedSubjectIds.length === 0) {
      toast.info("No subjects selected", "Select at least one subject.");
      return;
    }

    setIsAssigning(true);

    try {
      const assignmentPromises = selectedSubjectIds.map((subjectId) =>
        createTeacherSubject({
          teacherId: selectedTeacherId,
          subjectId,
        }),
      );

      const settled = await Promise.allSettled(assignmentPromises);
      const successfulCount = settled.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failedResults = settled.filter(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );

      if (successfulCount > 0) {
        toast.success(
          "Assignments created",
          `${successfulCount} subject${successfulCount > 1 ? "s were" : " was"} assigned.`,
        );
      }

      if (failedResults.length > 0) {
        const firstFailure = failedResults[0].reason;
        toast.error(
          "Some assignments failed",
          extractErrorMessage(
            firstFailure,
            `${failedResults.length} assignment${failedResults.length > 1 ? "s" : ""} could not be created.`,
          ),
        );
      }

      setSelectedSubjectIds([]);
      await Promise.all([
        loadAssignments(),
        loadTeacherAssignedSubjects(selectedTeacherId),
      ]);
    } finally {
      setIsAssigning(false);
    }
  }, [
    loadAssignments,
    loadTeacherAssignedSubjects,
    selectedSubjectIds,
    selectedTeacherId,
    toast,
  ]);

  const handleRemoveAssignment = useCallback(
    async (assignmentId: string, assignmentTeacherId: string) => {
      await deleteTeacherSubject(assignmentId);
      await loadAssignments();
      if (assignmentTeacherId === selectedTeacherId) {
        await loadTeacherAssignedSubjects(selectedTeacherId);
      }
    },
    [loadAssignments, loadTeacherAssignedSubjects, selectedTeacherId],
  );

  if (!isSessionReady) {
    return (
      <section className="mx-auto w-full max-w-6xl">
        <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
          <p className="text-sm text-muted-foreground">Validating center session...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Teacher-Subject Assignments
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign multiple subjects to one teacher in a single action.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[280px_1fr]">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Teacher
              </span>
              <select
                value={selectedTeacherId}
                onChange={(event) => {
                  setSelectedTeacherId(event.currentTarget.value);
                }}
                disabled={isReferenceLoading}
                className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {teachers.length === 0 ? (
                  <option value="">No active teachers available</option>
                ) : null}
                {teachers.map((teacher) => (
                  <option
                    key={teacher.id}
                    value={teacher.id}
                  >
                    {getTeacherName(teacher)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Search subjects
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={subjectSearch}
                  onChange={(event) => {
                    setSubjectSearch(event.currentTarget.value);
                  }}
                  placeholder="Filter subjects by name"
                  className="pl-9"
                />
              </div>
            </label>
          </div>

          {referenceErrorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {referenceErrorMessage}
            </p>
          ) : null}

          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-sm font-medium">
                {selectedTeacher ? `Subjects for ${getTeacherName(selectedTeacher)}` : "Subjects"}
              </p>
              <p className="text-xs text-muted-foreground">
                Selected {selectedSubjectIds.length}
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto px-3 py-2">
              {isReferenceLoading ? (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading teachers and subjects...
                </div>
              ) : visibleSubjects.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">
                  No subjects found.
                </p>
              ) : (
                <ul className="space-y-2">
                  {visibleSubjects.map((subject) => {
                    const isAssigned = assignedSet.has(subject.id);
                    const isChecked = selectedSubjectIds.includes(subject.id);

                    return (
                      <li key={subject.id}>
                        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2">
                          <span className="text-sm font-medium">{subject.name}</span>
                          {isAssigned ? (
                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              Assigned
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(event) => {
                                handleSubjectToggle(subject.id, event.currentTarget.checked);
                              }}
                              className="size-4 rounded border-input"
                            />
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => {
                void handleAssignSelected();
              }}
              disabled={
                isAssigning ||
                !selectedTeacherId ||
                selectedSubjectIds.length === 0
              }
            >
              {isAssigning ? "Assigning..." : "Assign Selected Subjects"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Filter by teacher
            </span>
            <select
              value={teacherFilterId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("teacherId", value);
                  } else {
                    params.delete("teacherId");
                  }

                  params.set("page", "1");
                });
              }}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">All teachers</option>
              {teachers.map((teacher) => (
                <option
                  key={teacher.id}
                  value={teacher.id}
                >
                  {getTeacherName(teacher)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Filter by subject
            </span>
            <select
              value={subjectFilterId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("subjectId", value);
                  } else {
                    params.delete("subjectId");
                  }

                  params.set("page", "1");
                });
              }}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">All subjects</option>
              {subjects.map((subject) => (
                <option
                  key={subject.id}
                  value={subject.id}
                >
                  {subject.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Per page</span>
            <select
              value={String(limit)}
              onChange={(event) => {
                const value = Number.parseInt(event.currentTarget.value, 10);
                replaceQueryParams((params) => {
                  params.set("limit", String(value));
                  params.set("page", "1");
                });
              }}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {limitOptions.map((option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option} rows
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card/90 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <caption className="sr-only">
              Teacher-subject assignments with teacher and subject filters
            </caption>
            <thead className="bg-muted/55 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Teacher
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Teacher Email
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Subject
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right font-medium"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {assignmentState.isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading assignments...
                  </td>
                </tr>
              ) : assignmentState.errorMessage ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-destructive"
                  >
                    {assignmentState.errorMessage}
                  </td>
                </tr>
              ) : assignmentState.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No assignments found.
                  </td>
                </tr>
              ) : (
                assignmentState.items.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="border-t"
                  >
                    <td className="px-4 py-3 font-medium">
                      {getTeacherName(assignment.teacher)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {assignment.teacher.email}
                    </td>
                    <td className="px-4 py-3">{assignment.subject.name}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setRemoveTarget(assignment);
                        }}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">Page {page}</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={assignmentState.isLoading || !hasPreviousPage}
              onClick={() => {
                replaceQueryParams((params) => {
                  params.set("page", String(page - 1));
                });
              }}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={assignmentState.isLoading || !hasNextPage}
              onClick={() => {
                replaceQueryParams((params) => {
                  params.set("page", String(page + 1));
                });
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <TeacherSubjectRemoveDialog
        open={removeTarget !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setRemoveTarget(null);
          }
        }}
        teacherName={
          removeTarget ? getTeacherName(removeTarget.teacher) : "Unknown teacher"
        }
        subjectName={removeTarget?.subject.name ?? "Unknown subject"}
        onConfirm={async () => {
          if (!removeTarget) {
            return;
          }

          await handleRemoveAssignment(removeTarget.id, removeTarget.teacher_id);
          toast.success("Assignment removed", "Teacher-subject link was removed.");
        }}
      />
    </section>
  );
}
