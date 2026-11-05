import "server-only";
import { connectDB } from "@/lib/db";
import { Account, Category, CreditCard, Debt, SavingsBox, Transaction } from "@/models";
import { monthsBetween, monthRange, type MonthKey } from "@/lib/dates";
import { accountDeltasExpr, cashflowMatch, oid } from "./rules";

/** Saldo efetivado de cada conta (saldo inicial + movimentações pagas até `asOf`). */
export async function accountBalances(userId: string, asOf?: Date): Promise<Map<string, number>> {
  await connectDB();
  const match: Record<string, unknown> = { userId: oid(userId), status: "paid" };
  if (asOf) match.date = { $lte: asOf };
  const [accounts, deltas] = await Promise.all([
    Account.find({ userId }).select("initialBalance").lean(),
    Transaction.aggregate<{ _id: unknown; total: number }>([
      { $match: match },
      { $project: { d: accountDeltasExpr } },
      { $unwind: "$d" },
      { $match: { "d.account": { $ne: null } } },
      { $group: { _id: "$d.account", total: { $sum: "$d.delta" } } },
    ]),
  ]);
  const map = new Map<string, number>();
  for (const a of accounts) map.set(String(a._id), a.initialBalance);
  for (const d of deltas) {
    const k = String(d._id);
    if (map.has(k)) map.set(k, (map.get(k) ?? 0) + d.total);
  }
  return map;
}

/** Saldo de cada caixinha (saldo inicial + depósitos − retiradas). */
export async function savingsBalances(userId: string): Promise<Map<string, number>> {
  await connectDB();
  const [boxes, rows] = await Promise.all([SavingsBox.find({ userId }).select("initialBalance").lean(), Transaction.aggregate<{ _id: unknown; total: number }>([
    { $match: { userId: oid(userId), status: "paid", kind: { $in: ["savings_deposit", "savings_withdrawal"] } } },
    {
      $group: {
        _id: "$savingsBoxId",
        total: { $sum: { $cond: [{ $eq: ["$kind", "savings_deposit"] }, "$amount", { $multiply: ["$amount", -1] }] } },
      },
    },
  ])]);
  const map = new Map<string, number>(boxes.map((b) => [String(b._id), b.initialBalance ?? 0]));
  for (const r of rows) map.set(String(r._id), (map.get(String(r._id)) ?? 0) + r.total);
  return map;
}

/** Por cartão: total de compras − total pago = obrigação em aberto (consome o limite). */
export async function cardOutstanding(userId: string): Promise<Map<string, number>> {
  await connectDB();
  const rows = await Transaction.aggregate<{ _id: unknown; total: number }>([
    // Só cobranças efetivadas consomem limite (recorrências futuras no cartão ficam "previstas").
    { $match: { userId: oid(userId), creditCardId: { $ne: null }, status: "paid", kind: { $in: ["expense", "card_payment"] } } },
    {
      $group: {
        _id: "$creditCardId",
        total: { $sum: { $cond: [{ $eq: ["$kind", "expense"] }, "$amount", { $multiply: ["$amount", -1] }] } },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.total]));
}

/** Saldo devedor por dívida = soma das parcelas ainda não pagas. */
export async function debtOutstanding(userId: string): Promise<Map<string, { outstanding: number; paid: number }>> {
  await connectDB();
  const rows = await Transaction.aggregate<{ _id: unknown; outstanding: number; paid: number }>([
    { $match: { userId: oid(userId), debtId: { $ne: null }, status: { $ne: "cancelled" } } },
    {
      $group: {
        _id: "$debtId",
        outstanding: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } },
        paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] } },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), { outstanding: r.outstanding, paid: r.paid }]));
}

export type PeriodTotals = { income: number; expense: number; pendingIncome: number; pendingExpense: number; result: number };

export async function periodTotals(userId: string, from: Date, to: Date): Promise<PeriodTotals> {
  await connectDB();
  const rows = await Transaction.aggregate<{ _id: { kind: string; status: string }; total: number }>([
    { $match: cashflowMatch(userId, from, to, "all") },
    { $group: { _id: { kind: "$kind", status: "$status" }, total: { $sum: "$amount" } } },
  ]);
  const get = (kind: string, status: string) => rows.find((r) => r._id.kind === kind && r._id.status === status)?.total ?? 0;
  const income = get("income", "paid");
  const expense = get("expense", "paid");
  return { income, expense, pendingIncome: get("income", "pending"), pendingExpense: get("expense", "pending"), result: income - expense };
}

export type MonthPoint = { month: MonthKey; income: number; expense: number; result: number };

/** Receitas e despesas efetivadas por mês. */
export async function monthlySeries(userId: string, fromMonth: MonthKey, toMonth: MonthKey, mode: "realized" | "all" = "realized"): Promise<MonthPoint[]> {
  await connectDB();
  const months = monthsBetween(fromMonth, toMonth);
  const rows = await Transaction.aggregate<{ _id: { m: string; kind: string }; total: number }>([
    { $match: cashflowMatch(userId, monthRange(fromMonth).from, monthRange(toMonth).to, mode) },
    { $group: { _id: { m: { $dateToString: { format: "%Y-%m", date: "$date" } }, kind: "$kind" }, total: { $sum: "$amount" } } },
  ]);
  return months.map((m) => {
    const income = rows.find((r) => r._id.m === m && r._id.kind === "income")?.total ?? 0;
    const expense = rows.find((r) => r._id.m === m && r._id.kind === "expense")?.total ?? 0;
    return { month: m, income, expense, result: income - expense };
  });
}

export type CategorySlice = { categoryId: string | null; name: string; color: string; icon: string; total: number };

/** Despesas (ou receitas) por categoria, agregando subcategorias na categoria-mãe. */
export async function totalsByCategory(
  userId: string,
  from: Date,
  to: Date,
  kind: "expense" | "income" = "expense",
  mode: "realized" | "all" = "realized",
): Promise<CategorySlice[]> {
  await connectDB();
  const match = { ...cashflowMatch(userId, from, to, mode), kind };
  const [rows, categories] = await Promise.all([
    Transaction.aggregate<{ _id: unknown; total: number }>([{ $match: match }, { $group: { _id: "$categoryId", total: { $sum: "$amount" } } }]),
    Category.find({ userId }).select("name color icon parentId").lean(),
  ]);
  const byId = new Map(categories.map((c) => [String(c._id), c]));
  const acc = new Map<string, CategorySlice>();
  for (const r of rows) {
    let cat = r._id ? byId.get(String(r._id)) : undefined;
    if (cat?.parentId) cat = byId.get(String(cat.parentId)) ?? cat;
    const key = cat ? String(cat._id) : "none";
    const cur = acc.get(key) ?? {
      categoryId: cat ? String(cat._id) : null,
      name: cat?.name ?? "Sem categoria",
      color: cat?.color ?? "#9ca3af",
      icon: cat?.icon ?? "tag",
      total: 0,
    };
    cur.total += r.total;
    acc.set(key, cur);
  }
  return [...acc.values()].sort((a, b) => b.total - a.total);
}

/** Despesas fixas × variáveis no período. */
export async function fixedVsVariable(userId: string, from: Date, to: Date) {
  await connectDB();
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    { $match: { ...cashflowMatch(userId, from, to, "realized"), kind: "expense" } },
    { $group: { _id: { $ifNull: ["$nature", "variable"] }, total: { $sum: "$amount" } } },
  ]);
  return { fixed: rows.find((r) => r._id === "fixed")?.total ?? 0, variable: rows.find((r) => r._id === "variable")?.total ?? 0 };
}

export type NetWorth = {
  accounts: number;
  savings: number;
  cardDebt: number;
  debts: number;
  netWorth: number;
};

/** Patrimônio = contas + caixinhas − obrigações de cartão − saldo devedor de dívidas. */
export async function netWorth(userId: string): Promise<NetWorth> {
  const [acc, sav, cards, debts, activeDebts, activeCards] = await Promise.all([
    accountBalances(userId),
    savingsBalances(userId),
    cardOutstanding(userId),
    debtOutstanding(userId),
    Debt.find({ userId, status: "active" }).select("_id").lean(),
    CreditCard.find({ userId }).select("_id").lean(),
  ]);
  const sum = (it: Iterable<number>) => [...it].reduce((a, b) => a + b, 0);
  const accounts = sum(acc.values());
  const savings = sum(sav.values());
  const cardDebt = activeCards.reduce((s, c) => s + Math.max(0, cards.get(String(c._id)) ?? 0), 0);
  const debtTotal = activeDebts.reduce((s, d) => s + (debts.get(String(d._id))?.outstanding ?? 0), 0);
  return { accounts, savings, cardDebt, debts: debtTotal, netWorth: accounts + savings - cardDebt - debtTotal };
}
