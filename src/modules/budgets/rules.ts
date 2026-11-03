/** Regras puras de orçamento (testáveis sem banco). */

export type BudgetLevel = "ok" | "attention" | "warning" | "critical" | "exceeded";

/** Maior limiar atingido (ex.: [50,75,90,100] e 92% -> 90). */
export function reachedThreshold(spent: number, limit: number, thresholds: number[]): number | null {
  if (limit <= 0) return spent > 0 ? 100 : null;
  const pct = (spent / limit) * 100;
  const sorted = [...thresholds].sort((a, b) => a - b);
  let hit: number | null = null;
  for (const t of sorted) if (pct >= t) hit = t;
  return hit;
}

export function budgetLevel(spent: number, limit: number): BudgetLevel {
  const pct = limit > 0 ? (spent / limit) * 100 : spent > 0 ? Infinity : 0;
  if (pct >= 100) return "exceeded";
  if (pct >= 90) return "critical";
  if (pct >= 75) return "warning";
  if (pct >= 50) return "attention";
  return "ok";
}
