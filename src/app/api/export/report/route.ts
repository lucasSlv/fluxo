import type { NextRequest } from "next/server";
import { monthLabel, toISODate } from "@/lib/dates";
import { resolvePeriod } from "@/lib/period";
import { getReport } from "@/modules/reports/service";
import { csvResponse, withUser } from "../../_helpers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withUser(async (user) => {
    const sp = req.nextUrl.searchParams;
    const period = resolvePeriod({ month: sp.get("month") ?? undefined, year: sp.get("year") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined }, user.preferences.timezone);
    const r = await getReport(user.id, user.preferences.timezone, period, user.preferences.alertThresholds);
    const pct = (v: number | null) => (v == null ? "" : `${v.toFixed(1).replace(".", ",")}%`);
    const rows: unknown[][] = [
      [`Relatório Fluxo — ${period.label}`],
      [],
      ["Resumo do período"],
      ["Receitas (R$)", "Despesas (R$)", "Resultado (R$)", "Taxa de economia"],
      [r.totals.income, r.totals.expense, r.totals.result, pct(r.savingsRate)],
      [],
      ["Mês", "Receitas (R$)", "Despesas (R$)", "Resultado (R$)", "Taxa de economia", "Saldo em contas (R$)"],
      ...r.series.map((s) => [monthLabel(s.month, true), s.income, s.expense, s.result, pct(s.savingsRate), s.balance]),
      [],
      ["Categoria (despesas)", "Total (R$)", "% das despesas"],
      ...r.byCategory.map((c) => [c.name, c.total, pct(r.totals.expense ? (c.total / r.totals.expense) * 100 : null)]),
      [],
      ["Categoria (receitas)", "Total (R$)"],
      ...r.byCategoryIncome.map((c) => [c.name, c.total]),
    ];
    return csvResponse(rows, `relatorio_${toISODate(period.from)}_${toISODate(period.to)}.csv`);
  });
}
