import { CalendarCheck2, GraduationCap, Wallet } from "lucide-react";

const metrics = [
  {
    label: "Active Students",
    value: "0",
    change: "No data yet",
    icon: GraduationCap,
  },
  {
    label: "Scheduled Sessions",
    value: "0",
    change: "No data yet",
    icon: CalendarCheck2,
  },
  {
    label: "Monthly Revenue",
    value: "$0",
    change: "No data yet",
    icon: Wallet,
  },
] as const;

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Operational overview for your center.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              key={metric.label}
              className="rounded-2xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {metric.label}
                </p>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{metric.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.change}</p>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Upcoming Sessions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your next classes and private sessions will appear here.
          </p>
          <div className="mt-4 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No sessions scheduled yet.
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Recent Payments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Last payment activity across students and groups.
          </p>
          <div className="mt-4 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No payment records available yet.
          </div>
        </section>
      </div>
    </section>
  );
}
