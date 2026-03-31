import type { ReactNode } from "react";

type FilterFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function FilterField({ label, children, className }: FilterFieldProps) {
  return (
    <label className={className ?? "min-w-0 space-y-1"}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
