/**
 * Insights automáticos — funções puras sobre dados reais já agregados.
 * Cada regra só gera texto quando há base suficiente; nada é estimado sem dados.
 */
import { formatMoney } from "@/lib/money";
import { monthLabel, type MonthKey } from "@/lib/dates";

export type Insight = { id: string; tone: "pos" | "neg" | "warn" | "info"; text: string; weight: number };

export type InsightInput = {
  month: MonthKey;
  series: { month: MonthKey; income: number; expense: number }[]; // em ordem cronológica, terminando em `month`
  categoriesNow: { categoryId: string | null; name: string; total: number }[];
  categoriesPrev: { categoryId: string | null; name: string; total: number }[];
  fixedExpenses: number; // despesas fixas do mês
  budgets: { name: string; pct: number; spent: number; limit: number }[];
  goals: { name: string; monthsLeft: number | null; remaining: number }[];
  overdueCount: number;
  overdueTotal: number;
  /** Mês ainda em andamento: comparações de "gastou menos" seriam enganosas e são omitidas. */
  partialMonth?: boolean;
  currency?: string;
};

const pct = (v: number) => `${Math.round(v)}%`;

export function buildInsights(i: InsightInput): Insight[] {
  const out: Insight[] = [];
  const money = (c: number) => formatMoney(c, i.currency);
  const now = i.series.at(-1);
  const prev = i.series.at(-2);

  // 1. Variação por categoria vs mês anterior (mín. R$ 50 de diferença e 10%).
  for (const c of i.categoriesNow) {
    const p = i.categoriesPrev.find((x) => x.categoryId === c.categoryId);
    if (!p || p.total <= 0) continue;
    const diff = c.total - p.total;
    const change = (diff / p.total) * 100;
    if (Math.abs(diff) < 5000 || Math.abs(change) < 10) continue;
    if (diff > 0)
      out.push({ id: `cat-up-${c.categoryId}`, tone: "neg", weight: Math.abs(diff), text: `Seus gastos com ${c.name.toLowerCase()} aumentaram ${pct(change)} em relação ao mês anterior.` });
    else if (!i.partialMonth)
      out.push({ id: `cat-down-${c.categoryId}`, tone: "pos", weight: Math.abs(diff), text: `Você gastou ${money(-diff)} a menos com ${c.name.toLowerCase()} neste mês.` });
  }

  // 2. Comprometimento com despesas fixas.
  if (now && now.income > 0 && i.fixedExpenses > 0) {
    const share = (i.fixedExpenses / now.income) * 100;
    out.push({
      id: "fixed-share",
      tone: share > 50 ? "neg" : share > 35 ? "warn" : "info",
      weight: share * 100,
      text: `Você compromete ${pct(share)} da sua renda com despesas fixas.`,
    });
  }

  // 3. Resultado negativo consecutivo.
  let streak = 0;
  for (let k = i.series.length - 1; k >= 0; k--) {
    const m = i.series[k];
    if (m.income === 0 && m.expense === 0) break;
    if (m.income - m.expense < 0) streak++;
    else break;
  }
  if (streak >= 2) out.push({ id: "neg-streak", tone: "neg", weight: 1e9, text: `Seu resultado financeiro está negativo pelo ${ordinal(streak)} mês consecutivo.` });
  else if (now && now.income > 0 && now.income - now.expense < 0)
    out.push({ id: "neg-month", tone: "neg", weight: 1e8, text: `Em ${monthLabel(i.month, true)} suas despesas superam as receitas em ${money(now.expense - now.income)}.` });

  // 4. Taxa de economia.
  if (now && now.income > 0) {
    const rate = ((now.income - now.expense) / now.income) * 100;
    if (rate >= 20 && !i.partialMonth) out.push({ id: "savings-rate", tone: "pos", weight: rate * 50, text: `Você economizou ${pct(rate)} da sua renda neste mês. Ótimo ritmo!` });
    else if (rate > 0 && prev && prev.income > 0) {
      const prevRate = ((prev.income - prev.expense) / prev.income) * 100;
      if (rate < prevRate - 5) out.push({ id: "savings-drop", tone: "warn", weight: 3000, text: `Sua taxa de economia caiu de ${pct(prevRate)} para ${pct(rate)}.` });
    }
  }

  // 5. Gastos totais vs média dos 3 meses anteriores.
  const base = i.series.slice(-4, -1).filter((m) => m.expense > 0);
  if (now && base.length >= 2 && !i.partialMonth) {
    const avg = base.reduce((s, m) => s + m.expense, 0) / base.length;
    const change = ((now.expense - avg) / avg) * 100;
    if (Math.abs(change) >= 15)
      out.push({
        id: "expense-vs-avg",
        tone: change > 0 ? "warn" : "pos",
        weight: Math.abs(now.expense - avg),
        text: `Suas despesas estão ${pct(Math.abs(change))} ${change > 0 ? "acima" : "abaixo"} da média dos últimos ${base.length} meses.`,
      });
  }

  // 6. Limites estourados ou próximos.
  for (const b of i.budgets) {
    if (b.pct >= 100) out.push({ id: `budget-${b.name}`, tone: "neg", weight: 5e7, text: `O limite de ${b.name.toLowerCase()} foi ultrapassado em ${money(b.spent - b.limit)}.` });
    else if (b.pct >= 90) out.push({ id: `budget-${b.name}`, tone: "warn", weight: 4e7, text: `Você já usou ${pct(b.pct)} do limite de ${b.name.toLowerCase()}.` });
  }

  // 7. Projeção de objetivos (somente com ritmo real de aportes).
  for (const g of i.goals) {
    if (g.monthsLeft && g.monthsLeft > 0 && g.remaining > 0)
      out.push({
        id: `goal-${g.name}`,
        tone: "info",
        weight: 2000,
        text: `Mantendo seu ritmo atual de economia, você alcançará "${g.name}" em aproximadamente ${g.monthsLeft} ${g.monthsLeft === 1 ? "mês" : "meses"}.`,
      });
  }

  // 8. Contas atrasadas.
  if (i.overdueCount > 0)
    out.push({ id: "overdue", tone: "neg", weight: 9e8, text: `Você tem ${i.overdueCount} ${i.overdueCount === 1 ? "conta atrasada" : "contas atrasadas"} somando ${money(i.overdueTotal)}.` });

  return out.sort((a, b) => b.weight - a.weight);
}

function ordinal(n: number): string {
  const words = ["", "primeiro", "segundo", "terceiro", "quarto", "quinto", "sexto"];
  return words[n] ?? `${n}º`;
}
