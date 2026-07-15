import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-background hover:bg-primary-strong disabled:bg-primary/40",
  secondary:
    "bg-surface-hover text-foreground border border-border hover:border-foreground-muted disabled:opacity-50",
  ghost: "text-foreground-muted hover:text-foreground disabled:opacity-50",
  danger: "bg-danger/15 text-danger hover:bg-danger/25 disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
