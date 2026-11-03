import { addDays, dateOnly, diffDays, monthKey, monthLabel, monthRange, parseDateOnly, shiftMonth, today, formatDate, type MonthKey } from "./dates";

export type PeriodParams = { month?: string; year?: string; from?: string; to?: string };
export type Period = { from: Date; to: Date; label: string; month: MonthKey | null; prevFrom: Date; prevTo: Date; mode: "month" | "year" | "custom" };

/** Interpreta o filtro de período da URL: ?month=YYYY-MM | ?year=YYYY | ?from=&to=. Padrão: mês atual. */
export function resolvePeriod(p: PeriodParams, tz: string): Period {
  try {
    if (p.from && p.to) {
      const from = parseDateOnly(p.from);
      const to = parseDateOnly(p.to);
      if (to >= from && diffDays(to, from) <= 366 * 5) {
        const len = diffDays(to, from) + 1;
        return { from, to, month: null, mode: "custom", label: `${formatDate(from)} – ${formatDate(to)}`, prevFrom: addDays(from, -len), prevTo: addDays(from, -1) };
      }
    }
    if (p.year && /^\d{4}$/.test(p.year)) {
      const y = +p.year;
      return { from: dateOnly(y, 1, 1), to: dateOnly(y, 12, 31), month: null, mode: "year", label: String(y), prevFrom: dateOnly(y - 1, 1, 1), prevTo: dateOnly(y - 1, 12, 31) };
    }
    if (p.month && /^\d{4}-\d{2}$/.test(p.month)) return monthPeriod(p.month);
  } catch {
    /* parâmetros inválidos caem no padrão */
  }
  return monthPeriod(monthKey(today(tz)));
}

export function monthPeriod(m: MonthKey): Period {
  const { from, to } = monthRange(m);
  const prev = monthRange(shiftMonth(m, -1));
  return { from, to, month: m, mode: "month", label: monthLabel(m, true), prevFrom: prev.from, prevTo: prev.to };
}
