import { CalendarDays, Clock3, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function SessionsPage() {
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Weekly schedule and session operations.
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          New Session
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Weekly Timeline</h2>
            <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
              Draft
            </span>
          </div>
          <div className="mt-4 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Calendar integration will appear here.
          </div>
        </section>

        <section className="space-y-4">
          <article className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Today</p>
              <CalendarDays className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold">0 Sessions</p>
          </article>
          <article className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Upcoming</p>
              <Clock3 className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold">0 Scheduled</p>
          </article>
        </section>
      </div>
    </section>
  );
}
