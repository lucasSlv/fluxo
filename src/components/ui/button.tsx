import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

export const buttonStyles = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cn(
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98]",
    {
      primary: "bg-ink text-white hover:bg-neutral-800 shadow-sm",
      secondary: "bg-muted text-ink hover:bg-neutral-200",
      ghost: "text-ink-2 hover:bg-muted hover:text-ink",
      danger: "bg-neg text-white hover:bg-red-700",
      outline: "border border-line bg-surface text-ink hover:bg-muted",
    }[variant],
    {
      sm: "h-8 px-3 text-xs rounded-lg",
      md: "h-10 px-4 text-sm rounded-xl",
      lg: "h-12 px-6 text-sm rounded-xl",
      icon: "h-9 w-9 rounded-full",
    }[size],
    className,
  );

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, loading, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonStyles(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
});
