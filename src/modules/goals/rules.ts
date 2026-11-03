import { addMonths, diffDays } from "@/lib/dates";

/**
 * Projeção de conclusão a partir do ritmo recente de aportes.
 * Retorna null quando não há ritmo positivo (não inventa previsão).
 */
export function projectGoal(args: { target: number; current: number; contributions: { amount: number; date: Date }[]; today: Date; windowMonths?: number }) {
  const { target, current, contributions, today } = args;
  const windowMonths = args.windowMonths ?? 3;
  const remaining = Math.max(0, target - current);
  if (remaining === 0) return { remaining, monthlyPace: 0, monthsLeft: 0, eta: today };
  const since = addMonths(today, -windowMonths);
  const recent = contributions.filter((c) => c.date >= since && c.date <= today);
  const total = recent.reduce((s, c) => s + c.amount, 0);
  if (!recent.length || total <= 0) return { remaining, monthlyPace: 0, monthsLeft: null, eta: null };
  const first = recent.reduce((a, c) => (c.date < a ? c.date : a), today);
  const spanMonths = Math.max(1, Math.min(windowMonths, Math.ceil(diffDays(today, first) / 30)));
  const monthlyPace = Math.round(total / spanMonths);
  const monthsLeft = Math.ceil(remaining / monthlyPace);
  return { remaining, monthlyPace, monthsLeft, eta: addMonths(today, monthsLeft) };
}

/** Aporte mensal necessário para atingir a meta na data prevista. */
export function requiredMonthly(remaining: number, today: Date, targetDate: Date | null): number | null {
  if (!targetDate || remaining <= 0) return null;
  const months = Math.max(1, Math.ceil(diffDays(targetDate, today) / 30));
  return Math.ceil(remaining / months);
}
