import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "min-h-11 w-full rounded-control border border-border bg-surface px-4 text-base text-text-primary outline-none transition-colors duration-150 placeholder:text-text-secondary focus:border-accent",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
