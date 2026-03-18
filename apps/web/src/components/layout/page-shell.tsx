import { cn } from "@/lib/utils";
import type { AppChildren } from "@/types";

type PageShellProps = AppChildren & {
  className?: string;
};

export function PageShell({ children, className }: PageShellProps) {
  return (
    <main
      className={cn(
        "min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </main>
  );
}
