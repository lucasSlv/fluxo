import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center", className)}>
      {icon && <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-ink-2">{icon}</div>}
      <p className="text-sm font-bold">{title}</p>
      {description && <p className="max-w-sm text-xs text-ink-3">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
