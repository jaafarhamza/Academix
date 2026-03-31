"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppAuth, useToast } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import { listStudents } from "@/modules/student/client/student-client";
import type { Student } from "@/modules/student/types/student.types";
import {
  createEnrollment,
  deactivateEnrollment,
  listEnrollments,
} from "@/modules/enrollment/client/enrollment-client";
import { EnrollmentRemoveDialog } from "@/modules/enrollment/components/enrollment-remove-dialog";
import {
  getStudentGroupDetail,
} from "../client/student-group-client";
import type { StudentGroupDetail } from "../types/student-group.types";

type StudentGroupDetailPageProps = {
  groupId: string;
};

type StudentGroupDetailState = {
  isLoading: boolean;
  errorMessage: string | null;
  group: StudentGroupDetail | null;
  enrolledStudents: Student[];
  allActiveStudents: Student[];
  enrollmentIdByStudentId: Record<string, string>;
  enrollmentDateByStudentId: Record<string, string>;
};

const initialState: StudentGroupDetailState = {
  isLoading: true,
  errorMessage: null,
  group: null,
  enrolledStudents: [],
  allActiveStudents: [],
  enrollmentIdByStudentId: {},
  enrollmentDateByStudentId: {},
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

function extractErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return dateFormatter.format(date);
}

export function StudentGroupDetailPage({ groupId }: StudentGroupDetailPageProps) {
  const router = useRouter();
  const toast = useToast();
  const { user, setUser, clearUser } = useAppAuth();
  const isAdmin = user?.role === "ADMIN";

  const [state, setState] = useState<StudentGroupDetailState>(initialState);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [isAddingEnrollment, setIsAddingEnrollment] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    enrollmentId: string;
    studentName: string;
  } | null>(null);

  useEffect(() => {
    if (isAdmin) {
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
      } catch {
        if (isCancelled) {
          return;
        }

        clearUser();
        router.replace("/center/login");
      }
    }

    void initializeCenterSession();

    return () => {
      isCancelled = true;
    };
  }, [clearUser, isAdmin, router, setUser]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const [group, enrollments, enrolledStudents, allActiveStudents] = await Promise.all([
          getStudentGroupDetail(groupId),
          listEnrollments({
            studentGroupId: groupId,
            isActive: true,
            page: 1,
            limit: 100,
          }),
          listStudents({
            groupId,
            isActive: true,
            page: 1,
            limit: 100,
          }),
          listStudents({
            isActive: true,
            page: 1,
            limit: 100,
          }),
        ]);

        if (isCancelled) {
          return;
        }

        const enrollmentIdByStudentId: Record<string, string> = {};
        const enrollmentDateByStudentId: Record<string, string> = {};
        for (const enrollment of enrollments) {
          enrollmentIdByStudentId[enrollment.student_id] = enrollment.id;
          enrollmentDateByStudentId[enrollment.student_id] = enrollment.enrollmentDate;
        }

        setState({
          isLoading: false,
          errorMessage: null,
          group,
          enrolledStudents,
          allActiveStudents,
          enrollmentIdByStudentId,
          enrollmentDateByStudentId,
        });

        const enrolledSet = new Set(enrolledStudents.map((student) => student.id));
        const availableStudents = allActiveStudents.filter(
          (student) => !enrolledSet.has(student.id),
        );
        setSelectedStudentId((previous) => {
          if (previous && availableStudents.some((student) => student.id === previous)) {
            return previous;
          }

          return availableStudents[0]?.id ?? "";
        });
      } catch (error: unknown) {
        if (isCancelled) {
          return;
        }

        setState({
          isLoading: false,
          errorMessage: extractErrorMessage(
            error,
            "Unable to load student group details.",
          ),
          group: null,
          enrolledStudents: [],
          allActiveStudents: [],
          enrollmentIdByStudentId: {},
          enrollmentDateByStudentId: {},
        });
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [groupId, isAdmin]);

  const reloadDetailData = useCallback(async () => {
    try {
      setState((previous) => ({
        ...previous,
        isLoading: true,
        errorMessage: null,
      }));

      const [group, enrollments, enrolledStudents, allActiveStudents] = await Promise.all([
        getStudentGroupDetail(groupId),
        listEnrollments({
          studentGroupId: groupId,
          isActive: true,
          page: 1,
          limit: 100,
        }),
        listStudents({
          groupId,
          isActive: true,
          page: 1,
          limit: 100,
        }),
        listStudents({
          isActive: true,
          page: 1,
          limit: 100,
        }),
      ]);

      const enrollmentIdByStudentId: Record<string, string> = {};
      const enrollmentDateByStudentId: Record<string, string> = {};
      for (const enrollment of enrollments) {
        enrollmentIdByStudentId[enrollment.student_id] = enrollment.id;
        enrollmentDateByStudentId[enrollment.student_id] = enrollment.enrollmentDate;
      }

      setState({
        isLoading: false,
        errorMessage: null,
        group,
        enrolledStudents,
        allActiveStudents,
        enrollmentIdByStudentId,
        enrollmentDateByStudentId,
      });

      const enrolledSet = new Set(enrolledStudents.map((student) => student.id));
      const availableStudents = allActiveStudents.filter(
        (student) => !enrolledSet.has(student.id),
      );
      setSelectedStudentId((previous) => {
        if (previous && availableStudents.some((student) => student.id === previous)) {
          return previous;
        }

        return availableStudents[0]?.id ?? "";
      });
    } catch (error: unknown) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        errorMessage: extractErrorMessage(error, "Unable to refresh group details."),
      }));

      throw error;
    }
  }, [groupId]);

  const studentCountLabel = useMemo(() => {
    const count = state.group?.studentNumbers ?? 0;
    return `${count} enrolled students`;
  }, [state.group?.studentNumbers]);

  const availableStudents = useMemo(() => {
    const enrolledSet = new Set(
      state.enrolledStudents.map((student) => student.id),
    );
    const query = studentSearch.trim().toLowerCase();

    return state.allActiveStudents.filter((student) => {
      if (enrolledSet.has(student.id)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const name = `${student.firstName} ${student.lastName}`.toLowerCase();
      return (
        name.includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.phone.toLowerCase().includes(query)
      );
    });
  }, [state.allActiveStudents, state.enrolledStudents, studentSearch]);

  const selectedStudent = useMemo(
    () =>
      availableStudents.find((student) => student.id === selectedStudentId) ?? null,
    [availableStudents, selectedStudentId],
  );

  const handleAddEnrollment = useCallback(async () => {
    if (!selectedStudentId) {
      return;
    }

    if (isAddingEnrollment) {
      return;
    }

    setIsAddingEnrollment(true);
    try {
      await createEnrollment({
        studentId: selectedStudentId,
        studentGroupId: groupId,
      });
      await reloadDetailData();
      toast.success("Student added", "Enrollment created successfully.");
    } catch (error: unknown) {
      toast.error(
        "Unable to add student",
        extractErrorMessage(error, "Please try again in a moment."),
      );
    } finally {
      setIsAddingEnrollment(false);
    }
  }, [groupId, isAddingEnrollment, reloadDetailData, selectedStudentId, toast]);

  const handleConfirmRemoveEnrollment = useCallback(async () => {
    if (!removeTarget) {
      return;
    }

    try {
      await deactivateEnrollment(removeTarget.enrollmentId);
      await reloadDetailData();
      toast.success("Student removed", "Enrollment was deactivated.");
      setRemoveTarget(null);
    } catch (error: unknown) {
      toast.error(
        "Unable to remove student",
        extractErrorMessage(error, "Please try again in a moment."),
      );
      throw error;
    }
  }, [reloadDetailData, removeTarget, toast]);

  if (!isAdmin) {
    return (
      <section className="mx-auto w-full max-w-6xl">
        <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
          <p className="text-sm text-muted-foreground">
            Validating center session...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/center/student-groups")}
            >
              <ArrowLeft className="size-4" />
              Back to Groups
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">
              {state.group?.name ?? "Student Group"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Group details and enrolled students.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            {studentCountLabel}
          </div>
        </div>

        {state.errorMessage ? (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.errorMessage}
          </p>
        ) : null}

        {state.group ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">School cycle</p>
              <p className="mt-1 text-sm font-medium">{state.group.schoolCycle}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">School year</p>
              <p className="mt-1 text-sm font-medium">{state.group.schoolYear}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Teacher</p>
              <p className="mt-1 text-sm font-medium">{state.group.teacherName}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="mt-1 text-sm font-medium">{state.group.subjectName}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 rounded-lg border bg-background p-4">
          <p className="text-sm font-medium">Enrollment Management</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add active students to this group or remove current enrollments.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <Input
              type="search"
              placeholder="Search available students by name, email, or phone"
              value={studentSearch}
              onChange={(event) => {
                setStudentSearch(event.currentTarget.value);
              }}
              disabled={state.isLoading || isAddingEnrollment}
            />
            <select
              value={selectedStudentId}
              onChange={(event) => {
                setSelectedStudentId(event.currentTarget.value);
              }}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              disabled={state.isLoading || isAddingEnrollment || availableStudents.length === 0}
            >
              {availableStudents.length === 0 ? (
                <option value="">No available students</option>
              ) : (
                availableStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName} • {student.schoolName ?? "No school"}
                  </option>
                ))
              )}
            </select>
            <Button
              type="button"
              onClick={() => {
                void handleAddEnrollment();
              }}
              disabled={
                state.isLoading ||
                isAddingEnrollment ||
                !selectedStudent ||
                availableStudents.length === 0
              }
            >
              <Plus className="size-4" />
              {isAddingEnrollment ? "Adding..." : "Add Student"}
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card/90 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <caption className="sr-only">Enrolled students in this group</caption>
            <thead className="bg-muted/55 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Student
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Email
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Phone
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  School
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Joined
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {state.isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading group details...
                  </td>
                </tr>
              ) : state.enrolledStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No active enrolled students found.
                  </td>
                </tr>
              ) : (
                state.enrolledStudents.map((student) => (
                  <tr key={student.id} className="border-t">
                    <td className="px-4 py-3 font-medium">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {student.email}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {student.phone}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {student.schoolName ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(
                        state.enrollmentDateByStudentId[student.id] ?? student.createdAt,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const enrollmentId =
                            state.enrollmentIdByStudentId[student.id];
                          if (!enrollmentId) {
                            return;
                          }

                          setRemoveTarget({
                            enrollmentId,
                            studentName: `${student.firstName} ${student.lastName}`,
                          });
                        }}
                        disabled={!state.enrollmentIdByStudentId[student.id]}
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
      </div>

      <EnrollmentRemoveDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null);
          }
        }}
        studentName={removeTarget?.studentName ?? ""}
        onConfirm={handleConfirmRemoveEnrollment}
      />
    </section>
  );
}
