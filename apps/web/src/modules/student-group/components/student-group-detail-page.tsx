"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppAuth } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import { listStudents } from "@/modules/student/client/student-client";
import type { Student } from "@/modules/student/types/student.types";
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
  students: Student[];
};

const initialState: StudentGroupDetailState = {
  isLoading: true,
  errorMessage: null,
  group: null,
  students: [],
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
  const { user, setUser, clearUser } = useAppAuth();
  const isAdmin = user?.role === "ADMIN";

  const [state, setState] = useState<StudentGroupDetailState>(initialState);

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
        const [group, students] = await Promise.all([
          getStudentGroupDetail(groupId),
          listStudents({
            groupId,
            isActive: true,
            page: 1,
            limit: 100,
          }),
        ]);

        if (isCancelled) {
          return;
        }

        setState({
          isLoading: false,
          errorMessage: null,
          group,
          students,
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
          students: [],
        });
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [groupId, isAdmin]);

  const studentCountLabel = useMemo(() => {
    const count = state.group?.studentNumbers ?? 0;
    return `${count} enrolled students`;
  }, [state.group?.studentNumbers]);

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
              </tr>
            </thead>
            <tbody>
              {state.isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading group details...
                  </td>
                </tr>
              ) : state.students.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No active enrolled students found.
                  </td>
                </tr>
              ) : (
                state.students.map((student) => (
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
                      {formatDate(student.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
