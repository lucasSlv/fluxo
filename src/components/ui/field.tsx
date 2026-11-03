import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-4 outline-none transition focus:border-ink/30 focus:ring-4 focus:ring-black/5 disabled:opacity-60 aria-[invalid=true]:border-neg/50 aria-[invalid=true]:bg-neg-soft/40";

export function Field({ label, error, hint, children, className }: { label?: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-xs font-semibold text-ink-2">{label}</span>}
      {children}
      {error ? <span className="text-xs font-medium text-neg">{error}</span> : hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(control, "h-10", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238a8a8f%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_0.8rem_center] bg-no-repeat pr-9", className)}
      {...props}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cn(control, "min-h-20 py-2.5", className)} {...props} />;
});

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-2">
      <input type="checkbox" className="h-4 w-4 rounded accent-ink" {...props} />
      {label}
    </label>
  );
}
