"use client";

import { cn } from "@/lib/cn";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectChipsProps {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
}

export function MultiSelectChips({ options, value, onChange }: MultiSelectChipsProps) {
  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={cn(
              "min-h-9 rounded-control border px-3 text-sm font-medium transition-colors duration-150",
              active
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-surface text-text-secondary hover:bg-accent-soft",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
