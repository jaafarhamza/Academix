export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-10 animate-pulse rounded-xl bg-muted" />
        <div className="mt-3 h-10 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
