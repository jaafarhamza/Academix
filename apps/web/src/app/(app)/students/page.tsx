import { Plus, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StudentsPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
        <p className="text-sm text-muted-foreground">
          Manage student profiles, enrollment status, and class assignment.
        </p>
      </header>

      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or CIN"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <SlidersHorizontal className="size-4" />
              Filters
            </Button>
            <Button>
              <Plus className="size-4" />
              Add Student
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border">
          <div className="grid grid-cols-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <span>Name</span>
            <span>Cycle</span>
            <span>Status</span>
          </div>
          <div className="space-y-2 p-3">
            <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
              No students available yet.
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
