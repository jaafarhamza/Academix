"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type {
  DatesSetArg,
  EventContentArg,
  EventInput,
  ToolbarInput,
} from "@fullcalendar/core";
import { clsx } from "clsx";
import type { ReactNode } from "react";

export type AcademixCalendarEventStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED";
export type AcademixCalendarView = "timeGridWeek" | "dayGridMonth";

export type AcademixCalendarEvent = EventInput & {
  extendedProps?: EventInput["extendedProps"] & {
    status?: AcademixCalendarEventStatus;
  };
};

type AcademixCalendarProps = {
  events: AcademixCalendarEvent[];
  className?: string;
  height?: number | "auto";
  initialView?: AcademixCalendarView;
  showViewToggle?: boolean;
  headerToolbar?: ToolbarInput | false;
  onDatesSet?: (arg: DatesSetArg) => void;
  renderEventContent?: (eventInfo: EventContentArg) => ReactNode;
};

const plugins = [dayGridPlugin, timeGridPlugin, interactionPlugin];

function getStatusEventClassName(arg: EventContentArg) {
  const status = arg.event.extendedProps?.status as AcademixCalendarEventStatus | undefined;

  if (status === "CANCELLED") {
    return "academix-calendar-event academix-calendar-event--cancelled";
  }

  if (status === "COMPLETED") {
    return "academix-calendar-event academix-calendar-event--completed";
  }

  return "academix-calendar-event academix-calendar-event--scheduled";
}

export function AcademixCalendar({
  events,
  className,
  height = "auto",
  initialView = "timeGridWeek",
  showViewToggle = true,
  headerToolbar,
  onDatesSet,
  renderEventContent,
}: AcademixCalendarProps) {
  const resolvedHeaderToolbar =
    headerToolbar === undefined
      ? {
          left: "prev,next today",
          center: "title",
          right: showViewToggle ? "timeGridWeek,dayGridMonth" : "",
        }
      : headerToolbar;

  return (
    <div className={clsx("academix-calendar", className)}>
      <FullCalendar
        plugins={plugins}
        initialView={initialView}
        eventDisplay="block"
        firstDay={1}
        nowIndicator
        allDaySlot={false}
        expandRows
        dayMaxEventRows={3}
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        height={height}
        headerToolbar={resolvedHeaderToolbar}
        datesSet={onDatesSet}
        eventClassNames={getStatusEventClassName}
        eventContent={renderEventContent}
        events={events}
      />
    </div>
  );
}
