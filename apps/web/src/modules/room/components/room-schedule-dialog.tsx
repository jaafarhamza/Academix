"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getRoomSchedule } from "../client/room-client";
import type { Room, RoomSchedule, RoomScheduleSession } from "../types/room.types";

type RoomScheduleDialogProps = {
  open: boolean;
  room: Room | null;
  onOpenChange: (isOpen: boolean) => void;
};

type RoomScheduleState = {
  schedule: RoomSchedule | null;
  errorMessage: string | null;
  loadedRoomId: string | null;
  failedRoomId: string | null;
};

const dayLabelMap: Record<RoomScheduleSession["day"], string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

const dayOrder: RoomScheduleSession["day"][] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unable to load room schedule right now.";
}

function getStatusBadgeClassName(status: RoomScheduleSession["status"]) {
  if (status === "COMPLETED") {
    return "inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300";
  }

  if (status === "CANCELLED") {
    return "inline-flex items-center rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300";
  }

  return "inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300";
}

function getAudienceLabel(session: RoomScheduleSession) {
  if (session.studentGroupName) {
    return session.studentGroupName;
  }

  if (session.studentName) {
    return session.studentName;
  }

  return "Not assigned";
}

export function RoomScheduleDialog({
  open,
  room,
  onOpenChange,
}: RoomScheduleDialogProps) {
  const [state, setState] = useState<RoomScheduleState>({
    schedule: null,
    errorMessage: null,
    loadedRoomId: null,
    failedRoomId: null,
  });
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    if (!open || !room) {
      return;
    }

    let isCancelled = false;

    void getRoomSchedule(room.id)
      .then((schedule) => {
        if (isCancelled) {
          return;
        }

        setState({
          schedule,
          errorMessage: null,
          loadedRoomId: room.id,
          failedRoomId: null,
        });
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        setState({
          schedule: null,
          errorMessage: getErrorMessage(error),
          loadedRoomId: null,
          failedRoomId: room.id,
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [open, reloadCounter, room]);

  const roomId = room?.id ?? null;
  const isLoading =
    Boolean(open && roomId) &&
    state.loadedRoomId !== roomId &&
    state.failedRoomId !== roomId;
  const schedule = roomId && state.loadedRoomId === roomId ? state.schedule : null;
  const errorMessage =
    roomId && state.failedRoomId === roomId ? state.errorMessage : null;

  const groupedSessions = useMemo(() => {
    if (!schedule) {
      return [];
    }

    const sessionsByDay = new Map<RoomScheduleSession["day"], RoomScheduleSession[]>();
    for (const day of dayOrder) {
      sessionsByDay.set(day, []);
    }

    for (const session of schedule.sessions) {
      const existing = sessionsByDay.get(session.day);
      if (existing) {
        existing.push(session);
      } else {
        sessionsByDay.set(session.day, [session]);
      }
    }

    return dayOrder
      .map((day) => ({
        day,
        sessions: sessionsByDay.get(day) ?? [],
      }))
      .filter((group) => group.sessions.length > 0);
  }, [schedule]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Room Schedule</DialogTitle>
          <DialogDescription>
            {room
              ? `${room.roomName} • Floor ${room.floor}`
              : "View room occupancy sessions."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading room schedule...
            </div>
          ) : null}

          {!isLoading && errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <p>{errorMessage}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setReloadCounter((previous) => previous + 1);
                }}
              >
                <RefreshCw className="size-4" />
                Retry
              </Button>
            </div>
          ) : null}

          {!isLoading && !errorMessage && schedule ? (
            schedule.sessions.length === 0 ? (
              <div className="rounded-lg border bg-card/70 px-3 py-6 text-center text-sm text-muted-foreground">
                No active sessions are currently occupying this room.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border bg-card/70 px-3 py-2 text-sm text-muted-foreground">
                  {schedule.totalSessions} session
                  {schedule.totalSessions === 1 ? "" : "s"} in this room.
                </div>

                {groupedSessions.map((group) => (
                  <section
                    key={group.day}
                    className="overflow-hidden rounded-lg border"
                    aria-label={`${dayLabelMap[group.day]} sessions`}
                  >
                    <div className="border-b bg-muted/40 px-3 py-2 text-sm font-medium">
                      {dayLabelMap[group.day]}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-170 text-left text-sm">
                        <caption className="sr-only">
                          {dayLabelMap[group.day]} sessions for the selected room
                        </caption>
                        <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Time</th>
                            <th className="px-3 py-2 font-medium">Subject</th>
                            <th className="px-3 py-2 font-medium">Teacher</th>
                            <th className="px-3 py-2 font-medium">Audience</th>
                            <th className="px-3 py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.sessions.map((session) => (
                            <tr
                              key={session.id}
                              className="border-t"
                            >
                              <td className="px-3 py-2 font-medium">
                                {session.start} - {session.end}
                              </td>
                              <td className="px-3 py-2">{session.subjectName}</td>
                              <td className="px-3 py-2">{session.teacherName}</td>
                              <td className="px-3 py-2">{getAudienceLabel(session)}</td>
                              <td className="px-3 py-2">
                                <span className={getStatusBadgeClassName(session.status)}>
                                  {session.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            )
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
