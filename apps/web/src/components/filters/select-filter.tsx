"use client";

type SelectFilterOption = {
  value: string;
  label: string;
};

type SelectFilterProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectFilterOption[];
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function SelectFilter({
  value,
  onChange,
  options,
  emptyLabel,
  disabled = false,
  className,
}: SelectFilterProps) {
  return (
    <select
      value={value}
      onChange={(event) => {
        onChange(event.currentTarget.value);
      }}
      className={
        className ??
        "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      }
      disabled={disabled}
    >
      {typeof emptyLabel === "string" ? <option value="">{emptyLabel}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
