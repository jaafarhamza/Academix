import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-xl rounded-2xl border bg-card p-8 text-card-foreground shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Academix Web</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tailwind CSS and shadcn/ui
        </p>
        <div className="mt-6 flex gap-3">
          <Button>Primary Action</Button>
          <Button variant="outline">Secondary Action</Button>
        </div>
      </section>
    </main>
  );
}
