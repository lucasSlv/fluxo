import { addDays, addMonths, dateOnly, daysInMonth } from "@/lib/dates";
import type { Frequency } from "@/models/Recurrence";

export const FREQUENCY_MONTHS: Record<Exclude<Frequency, "weekly">, number> = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

/** Primeira ocorrência: para frequências mensais, o primeiro `dueDay` em ou após a data inicial. */
export function firstOccurrence(startDate: Date, frequency: Frequency, dueDay: number): Date {
  if (frequency === "weekly") return startDate;
  const y = startDate.getUTCFullYear();
  const m = startDate.getUTCMonth() + 1;
  const candidate = dateOnly(y, m, Math.min(dueDay, daysInMonth(y, m)));
  return candidate >= startDate ? candidate : addMonths(candidate, 1, dueDay);
}

/**
 * Datas de ocorrência entre [from, until] (inclusive), respeitando data final.
 * Função pura e determinística: a mesma configuração sempre gera as mesmas datas (base da idempotência).
 */
export function occurrenceDates(
  cfg: { startDate: Date; endDate?: Date | null; frequency: Frequency; dueDay: number },
  from: Date,
  until: Date,
): Date[] {
  const out: Date[] = [];
  const end = cfg.endDate && cfg.endDate < until ? cfg.endDate : until;
  let d = firstOccurrence(cfg.startDate, cfg.frequency, cfg.dueDay);
  let i = 0;
  const first = d;
  while (d <= end && i < 2000) {
    if (d >= from) out.push(d);
    i++;
    d = cfg.frequency === "weekly" ? addDays(first, 7 * i) : addMonths(first, FREQUENCY_MONTHS[cfg.frequency] * i, cfg.dueDay);
  }
  return out;
}

/** Valor mensal equivalente (para cálculo de comprometimento da renda). */
export function monthlyEquivalent(amount: number, frequency: Frequency): number {
  if (frequency === "weekly") return Math.round((amount * 52) / 12);
  return Math.round(amount / FREQUENCY_MONTHS[frequency]);
}
