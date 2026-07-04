import { SelectHTMLAttributes, forwardRef } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "min-h-11 w-full appearance-none rounded-control border border-border bg-surface px-4 pr-10 text-base text-text-primary outline-none transition-colors duration-150 focus:border-accent",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <IconChevronDown
          size={16}
          stroke={1.75}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary"
        />
      </div>
    );
  },
);

Select.displayName = "Select";
