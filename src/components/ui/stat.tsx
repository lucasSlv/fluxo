import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Indicador grande, no estilo "11 Courses completed" da referência. */
export function Stat({ label, value, hint, icon, tone, className }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: "pos" | "neg" | "warn"; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-2xl bg-muted p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between text-xs font-semibold text-ink-3">
        <span>{label}</span>
        {icon && <span className="text-ink-4">{icon}</span>}
      </div>
      <div className={cn("whitespace-nowrap text-lg font-extrabold tracking-tight tabular sm:text-2xl", tone === "pos" && "text-pos", tone === "neg" && "text-neg", tone === "warn" && "text-warn")}>{value}</div>
      {hint && <div className="text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

export function Delta({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  if (!previous) return <span className="text-ink-4">sem base no mês anterior</span>;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const good = invert ? pct <= 0 : pct >= 0;
  return (
    <span className={cn("font-semibold", good ? "text-pos" : "text-neg")}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1).replace(".", ",")}% <span className="font-normal text-ink-3">vs. mês anterior</span>
    </span>
  );
}
