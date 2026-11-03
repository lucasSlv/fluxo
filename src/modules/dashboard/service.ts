import "server-only";
import { connectDB } from "@/lib/db";
import { addDays, monthKey, monthRange, shiftMonth, today, diffDays, type MonthKey } from "@/lib/dates";
import type { Period } from "@/lib/period";
import { Account, Goal, Transaction } from "@/models";
import { listBudgets } from "@/modules/budgets/service";
import { listGoals } from "@/modules/goals/service";
import { accountDeltasExpr, oid } from "@/modules/ledger/rules";
import { fixedVsVariable, monthlySeries, netWorth, periodTotals, totalsByCategory } from "@/modules/ledger/service";
import { buildInsights } from "@/modules/reports/insights";
import { ensureRecurrencesGenerated } from "@/modules/recurring/service";
import { upcomingCardInstallments } from "@/modules/credit-cards/service";


/** Saldo total das contas ao fim de cada mês (evolução patrimonial líquida em contas). */
export async function balanceSeries(userId: string, months: MonthKey[]) {
  await connectDB();
  const [accounts, rows] = await Promise.all([
    Account.find({ userId }).select("initialBalance").lean(),
    Transaction.aggregate<{ _id: string; total: number }>([
      { $match: { userId: oid(userId), status: "paid", date: { $lte: monthRange(months.at(-1)!).to } } },
      { $project: { m: { $dateToString: { format: "%Y-%m", date: "$date" } }, d: accountDeltasExpr } },
      { $unwind: "$d" },
      { $match: { "d.account": { $ne: null } } },
      { $group: { _id: "$m", total: { $sum: "$d.delta" } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const initial = accounts.reduce((s, a) => s + a.initialBalance, 0);
  return months.map((m) => ({ month: m, balance: initial + rows.filter((r) => r._id <= m).reduce((s, r) => s + r.total, 0) }));
}

export async function getDashboard(userId: string, tz: string, period: Period, thresholds: number[], dueSoonDays: number) {
  await connectDB();
  await ensureRecurrencesGenerated(userId, tz);
  const t = today(tz);
  const currentMonth = period.month ?? monthKey(period.to);
  const seriesMonths = Array.from({ length: 12 }, (_, i) => shiftMonth(currentMonth, i - 11));

  const [totals, prevTotals, worth, series, balances, byCategory, prevByCategory, fv, budgets, goals, upcoming, overdue, installments, recurringNext] = await Promise.all([
    periodTotals(userId, period.from, period.to),
    periodTotals(userId, period.prevFrom, period.prevTo),
    netWorth(userId),
    monthlySeries(userId, seriesMonths[0], currentMonth),
    balanceSeries(userId, seriesMonths),
    totalsByCategory(userId, period.from, period.to, "expense"),
    totalsByCategory(userId, period.prevFrom, period.prevTo, "expense"),
    fixedVsVariable(userId, period.from, period.to),
    listBudgets(userId, currentMonth, thresholds),
    listGoals(userId, tz),
    Transaction.find({ userId, status: "pending", dueDate: { $gte: t, $lte: addDays(t, Math.max(dueSoonDays, 7)) } })
      .sort({ dueDate: 1 })
      .limit(8)
      .populate("categoryId", "name icon color")
      .lean(),
    Transaction.find({ userId, status: "pending", dueDate: { $lt: t } }).sort({ dueDate: 1 }).limit(20).populate("categoryId", "name icon color").lean(),
    upcomingCardInstallments(userId, tz, 6),
    Transaction.find({ userId, recurrenceId: { $ne: null }, status: "pending", dueDate: { $gte: t } }).sort({ dueDate: 1 }).limit(6).lean(),
  ]);

  // Saldo previsto ao fim do período: saldo atual + pendências (de conta) até o fim do período, incluindo atrasadas.
  const pendingAgg = await Transaction.aggregate<{ _id: string; total: number }>([
    { $match: { userId: oid(userId), status: "pending", kind: { $in: ["income", "expense"] }, creditCardId: null, dueDate: { $lte: period.to > t ? period.to : t } } },
    { $group: { _id: "$kind", total: { $sum: "$amount" } } },
  ]);
  const pend = (k: string) => pendingAgg.find((p) => p._id === k)?.total ?? 0;
  const forecastBalance = worth.accounts + pend("income") - pend("expense");

  const incomeBase = totals.income + totals.pendingIncome;
  const expenseBase = totals.expense + totals.pendingExpense;
  const commitment = incomeBase > 0 ? (expenseBase / incomeBase) * 100 : null;
  const overdueTotal = overdue.reduce((s, o) => s + o.amount, 0);

  const insights = buildInsights({
    month: currentMonth,
    series,
    categoriesNow: byCategory,
    categoriesPrev: prevByCategory,
    fixedExpenses: fv.fixed,
    budgets,
    goals: goals.filter((g) => g.status === "active").map((g) => ({ name: g.name, monthsLeft: g.projection.monthsLeft, remaining: g.projection.remaining })),
    overdueCount: overdue.length,
    overdueTotal,
    partialMonth: currentMonth === monthKey(t),
  });

  return {
    today: t,
    totals,
    prevTotals,
    worth,
    forecastBalance,
    commitment,
    series: series.map((s, i) => ({ ...s, balance: balances[i].balance })),
    byCategory: byCategory.map((c) => ({ ...c, pctOfIncome: totals.income > 0 ? (c.total / totals.income) * 100 : null })),
    prevByCategory,
    fixedVsVariable: fv,
    budgets,
    budgetAlerts: budgets.filter((b) => b.threshold != null),
    goals: goals.filter((g) => g.status === "active").slice(0, 4),
    upcoming,
    overdue,
    overdueTotal,
    installments,
    recurringNext,
    insights: insights.slice(0, 5),
    daysLeft: diffDays(period.to, t),
    hasGoals: (await Goal.exists({ userId })) != null,
  };
}
