"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventContentArg, EventInput } from "@fullcalendar/core";
import { clsx } from "clsx";
import type { ReactNode } from "react";

export type AcademixCalendarEventStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED";

export type AcademixCalendarEvent = EventInput & {
  extendedProps?: EventInput["extendedProps"] & {
    status?: AcademixCalendarEventStatus;
  };
};

type AcademixCalendarProps = {
  events: AcademixCalendarEvent[];
  className?: string;
  height?: number | "auto";
  initialView?: "timeGridWeek" | "dayGridMonth";
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
  renderEventContent,
}: AcademixCalendarProps) {
  return (
    <div className={clsx("academix-calendar", className)}>
      <FullCalendar
        plugins={plugins}
        initialView={initialView}
        firstDay={1}
        nowIndicator
        allDaySlot={false}
        expandRows
        dayMaxEventRows={3}
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        height={height}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,dayGridMonth",
        }}
        eventClassNames={getStatusEventClassName}
        eventContent={renderEventContent}
        events={events}
      />
    </div>
  );
}
