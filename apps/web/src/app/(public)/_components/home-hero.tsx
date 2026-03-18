import { ModeToggle } from "@/components/shared/mode-toggle";
import { AppLogo } from "@/components/shared/app-logo";
import { siteConfig } from "@/lib/constants/site";

export function HomeHero() {
  return (
    <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-sm">
      <div className="pointer-events-none absolute -top-32 -right-14 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-10 h-64 w-64 rounded-full bg-chart-2/20 blur-3xl" />

      <div className="relative grid gap-8 p-8 sm:p-10 lg:items-start">
        <div>
          <div className="flex items-center justify-between">
            <AppLogo className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground" />
            <ModeToggle />
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
            Build and run your academic center with one workflow.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {siteConfig.description}
          </p>
        </div>
      </div>
    </section>
  );
}
