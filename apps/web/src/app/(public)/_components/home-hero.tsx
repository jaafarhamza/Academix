import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/shared/app-logo";
import { siteConfig } from "@/lib/constants/site";

export function HomeHero() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-start rounded-3xl border bg-card p-8 text-card-foreground shadow-sm sm:p-10">
      <AppLogo className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground" />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
        {siteConfig.name}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
        {siteConfig.description}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button>Start Building</Button>
        <Button variant="outline">Explore Components</Button>
      </div>
    </section>
  );
}
