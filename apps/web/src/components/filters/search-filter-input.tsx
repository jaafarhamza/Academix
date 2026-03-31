"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

type SearchFilterInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
};

export function SearchFilterInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: SearchFilterInputProps) {
  return (
    <label className={className ?? "relative block min-w-0"}>
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute top-4 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
        className="pl-9"
        disabled={disabled}
      />
    </label>
  );
}
