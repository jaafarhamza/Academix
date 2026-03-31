"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppAuth, useToast } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import { listTeacherSubjects } from "@/modules/teacher-subject/client/teacher-subject-client";
import type { TeacherSubjectAssignment } from "@/modules/teacher-subject/types/teacher-subject.types";
import {
  createStudentGroup,
  listStudentGroups,
} from "../client/student-group-client";
import {
  getSchoolYearOptionsForCycle,
  isSchoolYearAllowedForCycle,
  parseSchoolCycle,
  parseSchoolYear,
  schoolCycleLabels,
  schoolCycleOptions,
  schoolYearLabels,
} from "../constants/student-group-level";
import { StudentGroupFormDialog } from "./student-group-form-dialog";
import type { StudentGroup } from "../types/student-group.types";

type StudentGroupListState = {
  isLoading: boolean;
  errorMessage: string | null;
  items: StudentGroup[];
};

type TeacherSubjectLabelMap = Record<
  string,
  {
    teacherName: string;
    subjectName: string;
  }
>;

const initialStudentGroupListState: StudentGroupListState = {
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

function getTeacherName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function extractErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

export function StudentGroupListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, setUser, clearUser } = useAppAuth();
  const toast = useToast();

  const page = parsePositiveInteger(searchParams.get("page"), defaultPage);
  const rawLimit = parsePositiveInteger(searchParams.get("limit"), defaultLimit);
  const limit = limitOptions.includes(rawLimit) ? rawLimit : defaultLimit;
  const schoolCycleFilter = parseSchoolCycle(searchParams.get("schoolCycle"));
  const schoolYearFilter = parseSchoolYear(searchParams.get("schoolYear"));
  const isAdmin = user?.role === "ADMIN";

  const [state, setState] = useState<StudentGroupListState>(
    initialStudentGroupListState,
  );
  const [teacherSubjectLabels, setTeacherSubjectLabels] =
    useState<TeacherSubjectLabelMap>({});
  const [teacherSubjects, setTeacherSubjects] = useState<
    TeacherSubjectAssignment[]
  >([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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

  const replaceQueryParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      mutate(nextParams);

      const currentQuery = searchParams.toString();
      const nextQuery = nextParams.toString();
      if (nextQuery === currentQuery) {
        return;
      }

      setState((previous) => ({
        ...previous,
        isLoading: true,
        errorMessage: null,
      }));

      const target =
        nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const replaceQueryParamsSilently = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      mutate(nextParams);

      const currentQuery = searchParams.toString();
      const nextQuery = nextParams.toString();
      if (nextQuery === currentQuery) {
        return;
      }

      const target =
        nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const visibleSchoolYearOptions = useMemo(
    () => getSchoolYearOptionsForCycle(schoolCycleFilter),
    [schoolCycleFilter],
  );

  useEffect(() => {
    if (!schoolCycleFilter || !schoolYearFilter) {
      return;
    }

    if (isSchoolYearAllowedForCycle(schoolCycleFilter, schoolYearFilter)) {
      return;
    }

    replaceQueryParamsSilently((params) => {
      params.delete("schoolYear");
      params.set("page", "1");
    });
  }, [replaceQueryParamsSilently, schoolCycleFilter, schoolYearFilter]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const assignments = await listTeacherSubjects({
          page: 1,
          limit: 100,
        });

        if (isCancelled) {
          return;
        }

        const labels: TeacherSubjectLabelMap = {};
        for (const assignment of assignments) {
          labels[assignment.id] = {
            teacherName: getTeacherName(
              assignment.teacher.firstName,
              assignment.teacher.lastName,
            ),
            subjectName: assignment.subject.name,
          };
        }

        setTeacherSubjects(assignments);
        setTeacherSubjectLabels(labels);
      } catch {
        if (isCancelled) {
          return;
        }

        setTeacherSubjects([]);
        setTeacherSubjectLabels({});
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [isAdmin]);

  const refreshStudentGroups = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const studentGroups = await listStudentGroups({
        schoolCycle: schoolCycleFilter,
        schoolYear: schoolYearFilter,
        page,
        limit,
      });

      setState({
        isLoading: false,
        errorMessage: null,
        items: studentGroups,
      });
    } catch (error: unknown) {
      setState({
        isLoading: false,
        errorMessage: extractErrorMessage(
          error,
          "Unable to load student groups.",
        ),
        items: [],
      });
    }
  }, [limit, page, schoolCycleFilter, schoolYearFilter]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const studentGroups = await listStudentGroups({
          schoolCycle: schoolCycleFilter,
          schoolYear: schoolYearFilter,
          page,
          limit,
        });

        if (isCancelled) {
          return;
        }

        setState({
          isLoading: false,
          errorMessage: null,
          items: studentGroups,
        });
      } catch (error: unknown) {
        if (isCancelled) {
          return;
        }

        setState({
          isLoading: false,
          errorMessage: extractErrorMessage(
            error,
            "Unable to load student groups.",
          ),
          items: [],
        });
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [isAdmin, limit, page, schoolCycleFilter, schoolYearFilter]);

  const handleCreateStudentGroup = useCallback(
    async (payload: Parameters<typeof createStudentGroup>[0]) => {
      try {
        await createStudentGroup(payload);
        await refreshStudentGroups();
        toast.success(
          "Student group created",
          "The group was created successfully.",
        );
      } catch (error: unknown) {
        toast.error(
          "Unable to create student group",
          extractErrorMessage(error, "Please review the form values and try again."),
        );
        throw error;
      }
    },
    [refreshStudentGroups, toast],
  );

  const hasPreviousPage = page > 1;
  const hasNextPage = state.items.length === limit;

  const summaryLabel = useMemo(() => {
    if (state.items.length === 0) {
      return "No groups found for current filters.";
    }

    const firstItemIndex = (page - 1) * limit + 1;
    const lastItemIndex = firstItemIndex + state.items.length - 1;
    return `Showing ${firstItemIndex}-${lastItemIndex}`;
  }, [limit, page, state.items.length]);

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Student Groups</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse groups by school cycle and school year.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
              <GraduationCap className="size-4" />
              {summaryLabel}
            </div>
            <Button
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Add Group
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              School cycle
            </span>
            <select
              value={schoolCycleFilter ?? ""}
              onChange={(event) => {
                const value = event.currentTarget.value;
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("schoolCycle", value);

                    const selectedCycle = parseSchoolCycle(value);
                    const selectedSchoolYear = parseSchoolYear(
                      params.get("schoolYear"),
                    );
                    if (
                      selectedCycle &&
                      selectedSchoolYear &&
                      !isSchoolYearAllowedForCycle(
                        selectedCycle,
                        selectedSchoolYear,
                      )
                    ) {
                      params.delete("schoolYear");
                    }
                  } else {
                    params.delete("schoolCycle");
                  }

                  params.set("page", "1");
                });
              }}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">All cycles</option>
              {schoolCycleOptions.map(([schoolCycle, label]) => (
                <option key={schoolCycle} value={schoolCycle}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              School year
            </span>
            <select
              value={schoolYearFilter ?? ""}
              onChange={(event) => {
                const value = event.currentTarget.value;
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("schoolYear", value);
                  } else {
                    params.delete("schoolYear");
                  }

                  params.set("page", "1");
                });
              }}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">All years</option>
              {visibleSchoolYearOptions.map(([schoolYear, label]) => (
                <option key={schoolYear} value={schoolYear}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Per page
            </span>
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
                <option key={option} value={option}>
                  {option} rows
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card/90 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-left text-sm">
            <caption className="sr-only">
              Student groups list with school cycle and school year filters
            </caption>
            <thead className="bg-muted/55 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Group
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Cycle
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Year
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Teacher
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Subject
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
                    Loading student groups...
                  </td>
                </tr>
              ) : state.errorMessage ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-destructive"
                  >
                    {state.errorMessage}
                  </td>
                </tr>
              ) : state.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No student groups found.
                  </td>
                </tr>
              ) : (
                state.items.map((studentGroup) => {
                  const teacherSubject =
                    teacherSubjectLabels[studentGroup.teacher_subject_id];
                  const schoolCycleLabel =
                    schoolCycleLabels[studentGroup.schoolCycle] ??
                    studentGroup.schoolCycle;
                  const schoolYearLabel =
                    schoolYearLabels[studentGroup.schoolYear] ??
                    studentGroup.schoolYear;

                  return (
                    <tr key={studentGroup.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{studentGroup.name}</td>
                      <td className="px-4 py-3">{schoolCycleLabel}</td>
                      <td className="px-4 py-3">{schoolYearLabel}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {teacherSubject?.teacherName ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {teacherSubject?.subjectName ?? "-"}
                      </td>
                    </tr>
                  );
                })
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
              disabled={state.isLoading || !hasPreviousPage}
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
              disabled={state.isLoading || !hasNextPage}
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

      <StudentGroupFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        teacherSubjects={teacherSubjects}
        onCreate={handleCreateStudentGroup}
      />
    </section>
  );
}
