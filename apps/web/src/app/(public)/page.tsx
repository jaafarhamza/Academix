import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const floatingSymbols = [
  {
    label: "Scheduling",
    icon: CalendarClock,
    className:
      "top-8 left-4 -rotate-2 md:top-25 md:left-50 motion-safe:animate-academix-orbit motion-safe:animate-academix-pulse motion-safe:academix-delay-1",
  },
  {
    label: "Academics",
    icon: GraduationCap,
    className:
      "top-14 right-4 rotate-2 md:top-30 md:right-50 motion-safe:animate-academix-orbit-reverse motion-safe:animate-academix-pulse motion-safe:academix-delay-2",
  },
  {
    label: "Students",
    icon: Users,
    className:
      "bottom-20 left-6 rotate-1 md:bottom-30 md:left-50 motion-safe:animate-academix-orbit motion-safe:animate-academix-pulse motion-safe:academix-delay-3",
  },
  {
    label: "Finance",
    icon: BarChart3,
    className:
      "bottom-10 right-4 -rotate-1 md:bottom-25 md:right-50 motion-safe:animate-academix-orbit-reverse motion-safe:animate-academix-pulse motion-safe:academix-delay-4",
  },
] as const;

const operationalCards = [
  {
    title: "Daily Scheduling",
    description: "Classes, private sessions, and room usage aligned from one timeline.",
    icon: CalendarClock,
    accentClassName: "text-chart-4",
  },
  {
    title: "Student Operations",
    description: "Clear enrollment and progression tracking for every learning group.",
    icon: Users,
    accentClassName: "text-chart-5",
  },
  {
    title: "Financial Visibility",
    description: "Payment and expense signals in one practical dashboard view.",
    icon: BarChart3,
    accentClassName: "text-primary",
  },
] as const;

const highlights = [
  { value: "+35%", label: "Faster daily coordination" },
  { value: "1 panel", label: "For center operations" },
  { value: "Real-time", label: "Decision support" },
] as const;

export default function HomePage() {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative  w-screen overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 bg-background" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-muted/60 via-background to-muted/30" />
      <div className="pointer-events-none absolute -top-20 left-8 h-64 w-64 rounded-full bg-chart-4/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-8 h-72 w-72 rounded-full bg-chart-5/20 blur-3xl" />
      <div className="pointer-events-none absolute left-[45%] -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_0,transparent_calc(100%-1px),color-mix(in_oklab,var(--color-border)_35%,transparent)_100%),linear-gradient(to_bottom,transparent_0,transparent_calc(100%-1px),color-mix(in_oklab,var(--color-border)_35%,transparent)_100%)] bg-size-[30px_30px] opacity-55" />

      {floatingSymbols.map((symbol) => {
        const Icon = symbol.icon;

        return (
          <div
            key={symbol.label}
            className={`absolute z-10 hidden rounded-full border border-border/60 bg-card/72 px-3 py-1.5 text-xs text-muted-foreground shadow-md backdrop-blur-md sm:flex sm:items-center sm:gap-2 ${symbol.className}`}
          >
            <Icon className="size-3.5 text-chart-4" />
            <span>{symbol.label}</span>
          </div>
        );
      })}

      <div className="relative mx-auto flex min-h-[calc(100dvh)] w-full max-w-max items-center px-4 py-16 sm:px-6 sm:py-10 lg:px-8">
        <article className="w-full rounded-3xl border border-border/70 bg-card/88 p-6 shadow-2xl shadow-chart-5/10 backdrop-blur-sm sm:p-10 lg:p-12">
          <div className="flex flex-col gap-10">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                <ShieldCheck className="size-3.5 text-chart-4" />
                Professional center management workspace
              </div>

              <h1
                id="home-hero-title"
                className="mt-5 max-w-4xl text-5xl leading-[0.98] font-semibold tracking-tight sm:text-6xl xl:text-7xl"
              >
                Run your center with
                <span className="ml-2 bg-linear-to-r from-primary via-chart-4 to-chart-5 bg-clip-text text-transparent">
                  confidence
                </span>
                <br className="hidden sm:block" /> and operational precision.
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Build one clear operational system for scheduling, student lifecycle,
                and finance across your entire center.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-11 rounded-xl px-5"
                >
                  <Link href="/center/register">
                    Start Your Center
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-xl px-5"
                >
                  <Link href="/center/login">Center Sign In</Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {highlights.map((highlight) => (
                  <div
                    key={highlight.value}
                    className="rounded-xl border border-border/70 bg-background/65 p-3 backdrop-blur-sm"
                  >
                    <p className="text-base font-semibold">{highlight.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{highlight.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <section className="rounded-2xl border border-border/70 bg-background/78 p-5 shadow-xl backdrop-blur-sm sm:p-6">
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Daily Command View
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Everything critical before first class starts.
              </h2>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {operationalCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <article
                      key={card.title}
                      className="rounded-xl border border-border/70 bg-card/88 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex size-7 items-center justify-center rounded-lg border border-border/70 bg-background">
                          <Icon className={`size-4 ${card.accentClassName}`} />
                        </span>
                        <h3 className="text-sm font-semibold">{card.title}</h3>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {card.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </article>
      </div>
    </section>
  );
}
