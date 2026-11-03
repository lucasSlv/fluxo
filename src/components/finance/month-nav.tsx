import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftMonth, monthTitle } from "@/lib/dates";

/** Navegação simples por mês via URL (?month=YYYY-MM), mantendo outros parâmetros. */
export function MonthNav({ month, basePath, params = {} }: { month: string; basePath: string; params?: Record<string, string> }) {
  const href = (m: string) => `${basePath}?${new URLSearchParams({ ...params, month: m }).toString()}`;
  const circle = "flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink transition hover:bg-ink hover:text-white";
  return (
    <div className="flex items-center gap-2">
      <Link href={href(shiftMonth(month, -1))} className={circle} aria-label="Mês anterior" scroll={false}>
        <ChevronLeft size={16} />
      </Link>
      <span className="min-w-32 text-center text-sm font-bold">{monthTitle(month)}</span>
      <Link href={href(shiftMonth(month, 1))} className={circle} aria-label="Próximo mês" scroll={false}>
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}
