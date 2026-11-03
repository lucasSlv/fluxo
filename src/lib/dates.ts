/**
 * Datas de calendário (movimentação, vencimento) são "date-only": meia-noite UTC do dia.
 * Isso torna comparações e agrupamentos por dia/mês independentes do fuso do servidor.
 */
export const DEFAULT_TZ = "America/Sao_Paulo";

export function dateOnly(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

/** "2026-11-03" -> Date date-only. */
export function parseDateOnly(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) throw new Error(`Data inválida: ${s}`);
  const d = dateOnly(+m[1], +m[2], +m[3]);
  if (d.getUTCMonth() + 1 !== +m[2]) throw new Error(`Data inválida: ${s}`);
  return d;
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Hoje (date-only) no fuso informado. */
export function today(tz = DEFAULT_TZ, now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return parseDateOnly(parts);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Soma meses preservando o dia quando possível (31/01 + 1 mês = 28 ou 29/02). */
export function addMonths(d: Date, n: number, preferredDay?: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + n;
  const ty = y + Math.floor(m / 12);
  const tm = ((m % 12) + 12) % 12;
  const day = Math.min(preferredDay ?? d.getUTCDate(), daysInMonth(ty, tm + 1));
  return new Date(Date.UTC(ty, tm, day));
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export type MonthKey = string; // "YYYY-MM"

export function monthKey(d: Date): MonthKey {
  return d.toISOString().slice(0, 7);
}

export function parseMonthKey(k: string): { y: number; m: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(k);
  if (!m || +m[2] < 1 || +m[2] > 12) throw new Error(`Mês inválido: ${k}`);
  return { y: +m[1], m: +m[2] };
}

export function monthRange(k: MonthKey): { from: Date; to: Date } {
  const { y, m } = parseMonthKey(k);
  return { from: dateOnly(y, m, 1), to: dateOnly(y, m, daysInMonth(y, m)) };
}

export function shiftMonth(k: MonthKey, n: number): MonthKey {
  const { y, m } = parseMonthKey(k);
  return monthKey(addMonths(dateOnly(y, m, 1), n));
}

/** Lista de meses entre dois meses (inclusive). */
export function monthsBetween(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  let k = from;
  while (k <= to && out.length < 240) {
    out.push(k);
    k = shiftMonth(k, 1);
  }
  return out;
}

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_PT_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function monthLabel(k: MonthKey, long = false): string {
  const { y, m } = parseMonthKey(k);
  return long ? `${MONTHS_PT_LONG[m - 1]} de ${y}` : `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`;
}

export function formatDate(d: Date | string | null | undefined, format: "dd/MM/yyyy" | "yyyy-MM-dd" = "dd/MM/yyyy"): string {
  if (!d) return "—";
  const iso = typeof d === "string" ? d.slice(0, 10) : toISODate(d);
  if (format === "yyyy-MM-dd") return iso;
  const [y, m, day] = iso.split("-");
  return `${day}/${m}/${y}`;
}

/** "Novembro de 2026" (só a primeira letra maiúscula). */
export function monthTitle(k: MonthKey): string {
  const s = monthLabel(k, true);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
