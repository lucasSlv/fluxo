"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { monthTitle, shiftMonth } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

/** Filtro de período (mês, ano ou personalizado) refletido na URL. */
export function PeriodFilter({ mode, month, year, from, to }: { mode: "month" | "year" | "custom"; month: string; year: string; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const go = (params: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    ["month", "year", "from", "to", "page"].forEach((k) => next.delete(k));
    Object.entries(params).forEach(([k, v]) => next.set(k, v));
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const circle = "flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink transition hover:bg-ink hover:text-white";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        className="h-9 w-auto bg-surface text-xs font-semibold shadow-sm"
        value={mode}
        onChange={(e) => {
          const m = e.target.value;
          if (m === "month") go({ month });
          else if (m === "year") go({ year });
          else go({ from, to });
        }}
        aria-label="Tipo de período"
      >
        <option value="month">Mensal</option>
        <option value="year">Anual</option>
        <option value="custom">Personalizado</option>
      </Select>
      {mode === "month" && (
        <>
          <button className={circle} onClick={() => go({ month: shiftMonth(month, -1) })} aria-label="Mês anterior">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-28 text-center text-sm font-bold">{monthTitle(month)}</span>
          <button className={circle} onClick={() => go({ month: shiftMonth(month, 1) })} aria-label="Próximo mês">
            <ChevronRight size={16} />
          </button>
        </>
      )}
      {mode === "year" && (
        <>
          <button className={circle} onClick={() => go({ year: String(+year - 1) })} aria-label="Ano anterior">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-14 text-center text-sm font-bold">{year}</span>
          <button className={circle} onClick={() => go({ year: String(+year + 1) })} aria-label="Próximo ano">
            <ChevronRight size={16} />
          </button>
        </>
      )}
      {mode === "custom" && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (f && t && f <= t) go({ from: f, to: t });
          }}
        >
          <Input type="date" className="h-9 w-auto text-xs" value={f} onChange={(e) => setF(e.target.value)} aria-label="De" />
          <span className="text-xs text-ink-3">até</span>
          <Input type="date" className="h-9 w-auto text-xs" value={t} onChange={(e) => setT(e.target.value)} aria-label="Até" />
          <Button size="sm" type="submit">
            Aplicar
          </Button>
        </form>
      )}
    </div>
  );
}
