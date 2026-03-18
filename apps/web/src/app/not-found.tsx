import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="w-full max-w-md rounded-3xl border bg-card p-8 text-card-foreground shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The page you requested does not exist or has been moved.
        </p>
        <Button
          asChild
          className="mt-6"
        >
          <Link href="/">Back to home</Link>
        </Button>
      </section>
    </main>
  );
}
