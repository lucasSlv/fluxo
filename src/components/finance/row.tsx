import type { ReactNode } from "react";
import { IconTile } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/** Linha de lista no estilo dos cursos da referência: ícone, título/subtítulo, metadados e ação. */
export function Row({ icon, color, title, subtitle, meta, action, className }: { icon?: string | null; color?: string | null; title: ReactNode; subtitle?: ReactNode; meta?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl bg-muted p-3 transition hover:bg-neutral-200/60 sm:gap-4", className)}>
      <IconTile name={icon} color={color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold">{title}</p>
        {subtitle && <p className="truncate text-xs text-ink-3">{subtitle}</p>}
      </div>
      {meta && <div className="hidden shrink-0 items-center gap-4 text-xs font-semibold text-ink-2 sm:flex">{meta}</div>}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
