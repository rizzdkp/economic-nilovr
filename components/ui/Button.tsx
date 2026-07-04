import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent/90",
  secondary: "bg-surface text-text-primary border border-border hover:bg-accent-soft",
  danger: "bg-danger text-white hover:bg-danger/90",
  ghost: "bg-transparent text-text-primary hover:bg-accent-soft",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
