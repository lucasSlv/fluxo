import "server-only";
import { connectDB } from "@/lib/db";
import { monthKey, monthsBetween, today, addMonths, monthRange, shiftMonth } from "@/lib/dates";
import type { Period } from "@/lib/period";
import { Transaction } from "@/models";
import { balanceSeries } from "@/modules/dashboard/service";
import { listDebts } from "@/modules/debts/service";
import { listGoals } from "@/modules/goals/service";
import { cashflowMatch, oid } from "@/modules/ledger/rules";
import { fixedVsVariable, monthlySeries, netWorth, periodTotals, totalsByCategory } from "@/modules/ledger/service";
import { monthlyRecurringCommitment } from "@/modules/recurring/service";
import { listBudgets } from "@/modules/budgets/service";
import { buildInsights } from "./insights";

/** Mediana simples. */
function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export async function getReport(userId: string, tz: string, period: Period, thresholds: number[]) {
  await connectDB();
  const t = today(tz);
  const fromM = monthKey(period.from);
  const toM = monthKey(period.to);
  const months = monthsBetween(fromM, toM);
  // Para gráficos mensais, garante ao menos 6 meses de contexto.
  const chartMonths = months.length >= 6 ? months : monthsBetween(shiftMonth(toM, -5), toM);

  const [totals, prevTotals, series, balances, worth, byCat, byCatIncome, fv, recurringTotal, debts, goals, recurringCommitment] = await Promise.all([
    periodTotals(userId, period.from, period.to),
    periodTotals(userId, period.prevFrom, period.prevTo),
    monthlySeries(userId, chartMonths[0], chartMonths.at(-1)!),
    balanceSeries(userId, chartMonths),
    netWorth(userId),
    totalsByCategory(userId, period.from, period.to, "expense"),
    totalsByCategory(userId, period.from, period.to, "income"),
    fixedVsVariable(userId, period.from, period.to),
    Transaction.aggregate<{ total: number }>([
      { $match: { ...cashflowMatch(userId, period.from, period.to), kind: "expense", recurrenceId: { $ne: null } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    listDebts(userId, tz),
    listGoals(userId, tz),
    monthlyRecurringCommitment(userId),
  ]);

  // Comparativo mensal por categoria (top 6 categorias do período).
  const topCats = byCat.slice(0, 6);
  const catMonthly = await Transaction.aggregate<{ _id: { m: string; c: unknown }; total: number }>([
    { $match: { ...cashflowMatch(userId, monthRange(chartMonths[0]).from, monthRange(chartMonths.at(-1)!).to), kind: "expense" } },
    { $lookup: { from: "categories", localField: "categoryId", foreignField: "_id", as: "cat" } },
    { $addFields: { root: { $ifNull: [{ $first: "$cat.parentId" }, "$categoryId"] } } },
    { $group: { _id: { m: { $dateToString: { format: "%Y-%m", date: "$date" } }, c: "$root" }, total: { $sum: "$amount" } } },
  ]);
  const categoryComparison = chartMonths.map((m) => {
    const row: Record<string, number | string> = { month: m };
    for (const c of topCats) row[c.categoryId ?? "none"] = catMonthly.find((r) => r._id.m === m && String(r._id.c) === String(c.categoryId))?.total ?? 0;
    return row;
  });

  // Gastos extraordinários: avulsos (não recorrentes, não parcelados) ≥ 3× a mediana e ≥ R$ 100.
  const expenses = await Transaction.find({ ...cashflowMatch(userId, period.from, period.to), kind: "expense" })
    .select("description amount date categoryId recurrenceId installment debtId")
    .populate("categoryId", "name icon color")
    .lean();
  const med = median(expenses.map((e) => e.amount));
  const extraordinary = expenses
    .filter((e) => !e.recurrenceId && !e.debtId && !(e.installment?.total && e.installment.total > 1) && e.amount >= Math.max(10000, med * 3))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Planejamento: próximos 3 meses (pendências já conhecidas: recorrências, parcelas, dívidas, contas).
  const nextMonths = [1, 2, 3].map((i) => monthKey(addMonths(t, i - 1)));
  const future = await Transaction.aggregate<{ _id: { m: string; k: string }; total: number }>([
    {
      $match: {
        userId: oid(userId),
        kind: { $in: ["income", "expense"] },
        status: { $in: ["pending", "paid"] },
        date: { $gte: monthRange(nextMonths[0]).from, $lte: monthRange(nextMonths[2]).to },
        $or: [{ status: "pending" }, { creditCardId: { $ne: null } }],
      },
    },
    { $group: { _id: { m: { $dateToString: { format: "%Y-%m", date: "$date" } }, k: "$kind" }, total: { $sum: "$amount" } } },
  ]);
  const forecast = nextMonths.map((m) => ({
    month: m,
    income: future.find((f) => f._id.m === m && f._id.k === "income")?.total ?? 0,
    expense: future.find((f) => f._id.m === m && f._id.k === "expense")?.total ?? 0,
  }));

  const monthsCount = Math.max(1, months.length);
  const avgIncome = totals.income / monthsCount;
  const budgets = period.month ? await listBudgets(userId, period.month, thresholds) : [];
  const insightSeries = await monthlySeries(userId, shiftMonth(toM, -5), toM);
  const insights = buildInsights({
    month: toM,
    series: insightSeries,
    categoriesNow: await totalsByCategory(userId, monthRange(toM).from, monthRange(toM).to),
    categoriesPrev: await totalsByCategory(userId, monthRange(shiftMonth(toM, -1)).from, monthRange(shiftMonth(toM, -1)).to),
    fixedExpenses: (await fixedVsVariable(userId, monthRange(toM).from, monthRange(toM).to)).fixed,
    budgets,
    goals: goals.filter((g) => g.status === "active").map((g) => ({ name: g.name, monthsLeft: g.projection.monthsLeft, remaining: g.projection.remaining })),
    overdueCount: 0,
    overdueTotal: 0,
    partialMonth: toM === monthKey(t),
  });

  const activeDebts = debts.filter((d) => d.status === "active");
  return {
    totals,
    prevTotals,
    savingsRate: totals.income > 0 ? ((totals.income - totals.expense) / totals.income) * 100 : null,
    series: series.map((s, i) => ({ ...s, balance: balances[i].balance, savingsRate: s.income > 0 ? ((s.income - s.expense) / s.income) * 100 : null })),
    worth,
    byCategory: byCat,
    byCategoryIncome: byCatIncome,
    topCats,
    categoryComparison,
    fixedVsVariable: fv,
    recurringTotal: recurringTotal[0]?.total ?? 0,
    extraordinary,
    extraordinaryThreshold: Math.max(10000, med * 3),
    forecast,
    recurringCommitment,
    commitmentPct: avgIncome > 0 ? (recurringCommitment / avgIncome) * 100 : null,
    debts: activeDebts,
    debtTotal: activeDebts.reduce((s, d) => s + d.outstanding, 0),
    debtMonthly: activeDebts.reduce((s, d) => s + (d.pendingCount ? d.installmentAmount : 0), 0),
    goals,
    insights,
    hasEnoughHistory: series.filter((s) => s.income || s.expense).length >= 2,
  };
}
