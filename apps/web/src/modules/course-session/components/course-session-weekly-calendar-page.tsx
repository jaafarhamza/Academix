"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EventContentArg } from "@fullcalendar/core";
import { CalendarDays, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  AcademixCalendar,
  type AcademixCalendarEvent,
  type AcademixCalendarEventStatus,
  type AcademixCalendarView,
} from "@/components/calendar/academix-calendar";
import { FilterField } from "@/components/filters/filter-field";
import { SelectFilter } from "@/components/filters/select-filter";
import { Button } from "@/components/ui/button";
import { useAppAuth, useToast } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import { listRooms } from "@/modules/room/client/room-client";
import type { Room } from "@/modules/room/types/room.types";
import { listStudents } from "@/modules/student/client/student-client";
import type { Student } from "@/modules/student/types/student.types";
import { listStudentGroups } from "@/modules/student-group/client/student-group-client";
import type { StudentGroup } from "@/modules/student-group/types/student-group.types";
import { listSubjects } from "@/modules/subject/client/subject-client";
import type { Subject } from "@/modules/subject/types/subject.types";
import { listTeachers } from "@/modules/teacher/client/teacher-client";
import type { Teacher } from "@/modules/teacher/types/teacher.types";
import { listCourseSessions } from "../client/course-session-client";
import type {
  CourseSession,
  CourseSessionDay,
  CourseSessionStatus,
} from "../types/course-session.types";

type CourseSessionListState = {
  isLoading: boolean;
  errorMessage: string | null;
  items: CourseSession[];
};

type CourseSessionLookupState = {
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  studentGroups: StudentGroup[];
  students: Student[];
};

type CourseSessionCalendarEventExtendedProps = {
  status?: AcademixCalendarEventStatus;
  teacherName: string;
  roomName: string;
  audienceLabel: string;
};

const initialCourseSessionListState: CourseSessionListState = {
  isLoading: true,
  errorMessage: null,
  items: [],
};

const initialCourseSessionLookupState: CourseSessionLookupState = {
  teachers: [],
  subjects: [],
  rooms: [],
  studentGroups: [],
  students: [],
};

const dayLabelMap: Record<CourseSessionDay, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

const statusLabelMap: Record<CourseSessionStatus, string> = {
  SCHEDULED: "Scheduled",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

const dayNumberMap: Record<CourseSessionDay, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 0,
};

const validDays = new Set<CourseSessionDay>(Object.keys(dayLabelMap) as CourseSessionDay[]);
const validStatuses = new Set<CourseSessionStatus>(
  Object.keys(statusLabelMap) as CourseSessionStatus[],
);

const sessionsLimit = 100;

function extractErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

function parseDayFilter(value: string | null): CourseSessionDay | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return validDays.has(normalized as CourseSessionDay)
    ? (normalized as CourseSessionDay)
    : undefined;
}

function parseStatusFilter(value: string | null): CourseSessionStatus | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return validStatuses.has(normalized as CourseSessionStatus)
    ? (normalized as CourseSessionStatus)
    : undefined;
}

function parseUuidLike(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseCalendarView(value: string | null): AcademixCalendarView {
  return value === "month" ? "dayGridMonth" : "timeGridWeek";
}

function getTeacherName(teacher: Teacher) {
  return `${teacher.firstName} ${teacher.lastName}`.trim();
}

function getStudentName(student: Student) {
  return `${student.firstName} ${student.lastName}`.trim();
}

function getStatusBadgeClassName(status: CourseSessionStatus) {
  if (status === "COMPLETED") {
    return "inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300";
  }

  if (status === "CANCELLED") {
    return "inline-flex items-center rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300";
  }

  return "inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300";
}

function renderSessionCalendarEvent(eventInfo: EventContentArg) {
  const extendedProps = eventInfo.event
    .extendedProps as CourseSessionCalendarEventExtendedProps;
  const isMonthView = eventInfo.view.type === "dayGridMonth";

  if (isMonthView) {
    return (
      <div className="space-y-0.5 px-0.5">
        <p className="truncate text-[11px] font-semibold leading-tight">
          {eventInfo.event.title}
        </p>
        <p className="truncate text-[10px] leading-tight opacity-80">
          {extendedProps.teacherName}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 px-0.5">
      <p className="truncate text-[11px] font-semibold leading-tight">
        {eventInfo.event.title}
      </p>
      <p className="truncate text-[10px] leading-tight opacity-85">
        {extendedProps.teacherName}
      </p>
      <p className="truncate text-[10px] leading-tight opacity-80">
        {extendedProps.roomName}
      </p>
      <p className="truncate text-[10px] leading-tight opacity-70">
        {extendedProps.audienceLabel}
      </p>
    </div>
  );
}

export function CourseSessionWeeklyCalendarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, setUser, clearUser } = useAppAuth();
  const toast = useToast();

  const isCenterAdmin = user?.role === "ADMIN";
  const [lookupState, setLookupState] = useState<CourseSessionLookupState>(
    initialCourseSessionLookupState,
  );
  const [listState, setListState] = useState<CourseSessionListState>(
    initialCourseSessionListState,
  );
  const [reloadTick, setReloadTick] = useState(0);

  const teacherFilter = parseUuidLike(searchParams.get("teacherId"));
  const roomFilter = parseUuidLike(searchParams.get("roomId"));
  const dayFilter = parseDayFilter(searchParams.get("day"));
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const calendarView = parseCalendarView(searchParams.get("view"));

  useEffect(() => {
    if (isCenterAdmin) {
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
  }, [clearUser, isCenterAdmin, router, setUser]);

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

  useEffect(() => {
    if (!isCenterAdmin) {
      return;
    }

    let isCancelled = false;

    async function loadLookups() {
      const results = await Promise.allSettled([
        listTeachers({ page: 1, limit: sessionsLimit, isActive: true }),
        listSubjects({ page: 1, limit: sessionsLimit }),
        listRooms({ page: 1, limit: sessionsLimit }),
        listStudentGroups({ page: 1, limit: sessionsLimit }),
        listStudents({ page: 1, limit: sessionsLimit, isActive: true }),
      ]);

      if (isCancelled) {
        return;
      }

      setLookupState({
        teachers: results[0].status === "fulfilled" ? results[0].value : [],
        subjects: results[1].status === "fulfilled" ? results[1].value : [],
        rooms: results[2].status === "fulfilled" ? results[2].value : [],
        studentGroups: results[3].status === "fulfilled" ? results[3].value : [],
        students: results[4].status === "fulfilled" ? results[4].value : [],
      });
    }

    void loadLookups().catch((error: unknown) => {
      if (isCancelled) {
        return;
      }

      toast.info(
        "Some references are unavailable",
        extractErrorMessage(
          error,
          "Session blocks still load, but some names may appear as IDs.",
        ),
      );
    });

    return () => {
      isCancelled = true;
    };
  }, [isCenterAdmin, toast]);

  useEffect(() => {
    if (!isCenterAdmin) {
      return;
    }

    let isCancelled = false;

    async function loadSessions() {
      setListState((previous) => ({
        ...previous,
        isLoading: true,
        errorMessage: null,
      }));

      try {
        const sessions = await listCourseSessions({
          teacherId: teacherFilter,
          roomId: roomFilter,
          day: dayFilter,
          status: statusFilter,
          page: 1,
          limit: sessionsLimit,
        });

        if (isCancelled) {
          return;
        }

        setListState({
          isLoading: false,
          errorMessage: null,
          items: sessions,
        });
      } catch (error: unknown) {
        if (isCancelled) {
          return;
        }

        setListState({
          isLoading: false,
          errorMessage: extractErrorMessage(error, "Unable to load sessions."),
          items: [],
        });
      }
    }

    void loadSessions();

    return () => {
      isCancelled = true;
    };
  }, [dayFilter, isCenterAdmin, reloadTick, roomFilter, statusFilter, teacherFilter]);

  const teacherNameById = useMemo(() => {
    const map = new Map<string, string>();

    for (const teacher of lookupState.teachers) {
      map.set(teacher.id, getTeacherName(teacher));
    }

    return map;
  }, [lookupState.teachers]);

  const subjectNameById = useMemo(() => {
    const map = new Map<string, string>();

    for (const subject of lookupState.subjects) {
      map.set(subject.id, subject.name);
    }

    return map;
  }, [lookupState.subjects]);

  const roomNameById = useMemo(() => {
    const map = new Map<string, string>();

    for (const room of lookupState.rooms) {
      map.set(room.id, room.roomName);
    }

    return map;
  }, [lookupState.rooms]);

  const studentGroupNameById = useMemo(() => {
    const map = new Map<string, string>();

    for (const group of lookupState.studentGroups) {
      map.set(group.id, group.name);
    }

    return map;
  }, [lookupState.studentGroups]);

  const studentNameById = useMemo(() => {
    const map = new Map<string, string>();

    for (const student of lookupState.students) {
      map.set(student.id, getStudentName(student));
    }

    return map;
  }, [lookupState.students]);

  const teacherOptions = useMemo(
    () =>
      lookupState.teachers
        .map((teacher) => ({
          value: teacher.id,
          label: getTeacherName(teacher),
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [lookupState.teachers],
  );

  const roomOptions = useMemo(
    () =>
      lookupState.rooms
        .map((room) => ({
          value: room.id,
          label: `${room.roomName} (Floor ${room.floor})`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [lookupState.rooms],
  );

  const dayOptions = useMemo(
    () =>
      (Object.entries(dayLabelMap) as Array<[CourseSessionDay, string]>).map(
        ([value, label]) => ({
          value,
          label,
        }),
      ),
    [],
  );

  const statusOptions = useMemo(
    () =>
      (Object.entries(statusLabelMap) as Array<
        [CourseSessionStatus, string]
      >).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  const summaryLabel = useMemo(() => {
    if (listState.items.length === 0) {
      return "No sessions for current filters";
    }

    const periodLabel = calendarView === "dayGridMonth" ? "month" : "week";
    return `${listState.items.length} session${
      listState.items.length === 1 ? "" : "s"
    } in this ${periodLabel}`;
  }, [calendarView, listState.items.length]);

  const calendarEvents = useMemo<AcademixCalendarEvent[]>(() => {
    return listState.items.map((session) => {
      const subjectName =
        subjectNameById.get(session.subject_id) ?? `Subject ${session.subject_id.slice(0, 6)}`;
      const teacherName =
        teacherNameById.get(session.teacher_id) ?? `Teacher ${session.teacher_id.slice(0, 6)}`;
      const roomName =
        roomNameById.get(session.room_id) ?? `Room ${session.room_id.slice(0, 6)}`;

      const audienceLabel = session.student_group_id
        ? studentGroupNameById.get(session.student_group_id) ??
          `Group ${session.student_group_id.slice(0, 6)}`
        : session.student_id
          ? studentNameById.get(session.student_id) ??
            `Student ${session.student_id.slice(0, 6)}`
          : "Private session";

      return {
        id: session.id,
        title: subjectName,
        daysOfWeek: [dayNumberMap[session.day]],
        startTime: session.startTime,
        endTime: session.endTime,
        extendedProps: {
          status: session.status,
          teacherName,
          roomName,
          audienceLabel,
        },
      } satisfies AcademixCalendarEvent;
    });
  }, [
    listState.items,
    roomNameById,
    studentGroupNameById,
    studentNameById,
    subjectNameById,
    teacherNameById,
  ]);

  if (!isCenterAdmin) {
    return (
      <section className="mx-auto w-full max-w-7xl">
        <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
          <p className="text-sm text-muted-foreground">Validating center session...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-full space-y-4">
      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Sessions Calendar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Switch between weekly and monthly views .
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              {summaryLabel}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReloadTick((previous) => previous + 1);
              }}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <div className="inline-flex overflow-hidden rounded-lg border bg-background p-1">
              <Button
                type="button"
                size="sm"
                variant={calendarView === "timeGridWeek" ? "default" : "ghost"}
                onClick={() => {
                  replaceQueryParams((params) => {
                    params.set("view", "week");
                  });
                }}
              >
                Week
              </Button>
              <Button
                type="button"
                size="sm"
                variant={calendarView === "dayGridMonth" ? "default" : "ghost"}
                onClick={() => {
                  replaceQueryParams((params) => {
                    params.set("view", "month");
                  });
                }}
              >
                Month
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <FilterField label="Teacher">
            <SelectFilter
              value={teacherFilter ?? ""}
              onChange={(value) => {
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("teacherId", value);
                  } else {
                    params.delete("teacherId");
                  }
                });
              }}
              options={teacherOptions}
              emptyLabel="All teachers"
            />
          </FilterField>

          <FilterField label="Room">
            <SelectFilter
              value={roomFilter ?? ""}
              onChange={(value) => {
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("roomId", value);
                  } else {
                    params.delete("roomId");
                  }
                });
              }}
              options={roomOptions}
              emptyLabel="All rooms"
            />
          </FilterField>

          <FilterField label="Day">
            <SelectFilter
              value={dayFilter ?? ""}
              onChange={(value) => {
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("day", value);
                  } else {
                    params.delete("day");
                  }
                });
              }}
              options={dayOptions}
              emptyLabel="All days"
            />
          </FilterField>

          <FilterField label="Status">
            <SelectFilter
              value={statusFilter ?? ""}
              onChange={(value) => {
                replaceQueryParams((params) => {
                  if (value) {
                    params.set("status", value);
                  } else {
                    params.delete("status");
                  }
                });
              }}
              options={statusOptions}
              emptyLabel="All statuses"
            />
          </FilterField>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(Object.entries(statusLabelMap) as Array<[CourseSessionStatus, string]>).map(
            ([status, label]) => (
              <span key={status} className={getStatusBadgeClassName(status)}>
                {label}
              </span>
            ),
          )}
        </div>
      </div>

      {listState.errorMessage ? (
        <div className="rounded-xl border bg-card/90 p-8 text-center text-sm text-destructive shadow-xs">
          {listState.errorMessage}
        </div>
      ) : (
        <div className="rounded-xl border bg-card/90 p-4 shadow-xs">
          {listState.isLoading ? (
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Loading sessions calendar...
            </div>
          ) : null}

          <AcademixCalendar
            key={calendarView}
            className="mt-3"
            initialView={calendarView}
            showViewToggle={false}
            height="auto"
            events={calendarEvents}
            renderEventContent={renderSessionCalendarEvent}
          />

          {!listState.isLoading && calendarEvents.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No sessions match the selected filters.
            </p>
          ) : null}

          {listState.items.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-180 text-left text-sm">
                  <caption className="sr-only">
                    Weekly sessions details table
                  </caption>
                  <thead className="bg-muted/55 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Day
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Time
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Subject
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Teacher
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Room
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Audience
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {listState.items.map((session) => {
                      const audienceLabel = session.student_group_id
                        ? studentGroupNameById.get(session.student_group_id) ??
                          `Group ${session.student_group_id.slice(0, 6)}`
                        : session.student_id
                          ? studentNameById.get(session.student_id) ??
                            `Student ${session.student_id.slice(0, 6)}`
                          : "Private session";

                      return (
                        <tr key={session.id} className="border-t">
                          <td className="px-3 py-2.5">{dayLabelMap[session.day]}</td>
                          <td className="px-3 py-2.5">
                            {session.startTime} - {session.endTime}
                          </td>
                          <td className="px-3 py-2.5">
                            {subjectNameById.get(session.subject_id) ??
                              `Subject ${session.subject_id.slice(0, 6)}`}
                          </td>
                          <td className="px-3 py-2.5">
                            {teacherNameById.get(session.teacher_id) ??
                              `Teacher ${session.teacher_id.slice(0, 6)}`}
                          </td>
                          <td className="px-3 py-2.5">
                            {roomNameById.get(session.room_id) ??
                              `Room ${session.room_id.slice(0, 6)}`}
                          </td>
                          <td className="px-3 py-2.5">{audienceLabel}</td>
                          <td className="px-3 py-2.5">
                            <span className={getStatusBadgeClassName(session.status)}>
                              {statusLabelMap[session.status]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
