import "server-only";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { AppError, invalid } from "@/lib/errors";
import { addMonths, today } from "@/lib/dates";
import { Category, Debt, Transaction } from "@/models";
import { ensureAccountUsable } from "@/modules/accounts/service";
import { systemCategory } from "@/modules/categories/service";
import { debtOutstanding } from "@/modules/ledger/service";
import { oid } from "@/modules/ledger/rules";
import { audit } from "@/modules/shared/audit";
import { assertOwned } from "@/modules/shared/ownership";
import { debtSchema, debtUpdateSchema, extraPaymentSchema, type DebtInput, type DebtUpdateInput } from "./schemas";

/** Cria a dívida e gera as parcelas restantes como despesas pendentes. */
export async function createDebt(userId: string, input: DebtInput) {
  const data = debtSchema.parse(input);
  await connectDB();
  await ensureAccountUsable(userId, data.accountId);
  let categoryId = data.categoryId;
  if (categoryId) {
    const cat = await assertOwned(Category, userId, categoryId, "Categoria");
    if (cat.kind !== "expense") throw invalid("Use uma categoria de despesa.", { categoryId: "Categoria incompatível" });
  } else categoryId = await systemCategory(userId, "debt");

  const debt = await Debt.create({ ...data, categoryId, userId, totalAmount: data.installmentAmount * data.installmentsCount });
  const docs = [];
  for (let i = data.paidBefore; i < data.installmentsCount; i++) {
    const due = addMonths(data.firstDueDate, i, data.firstDueDate.getUTCDate());
    docs.push({
      userId,
      kind: "expense",
      description: `${data.name} (${i + 1}/${data.installmentsCount})`,
      amount: data.installmentAmount,
      date: due,
      dueDate: due,
      status: "pending",
      categoryId,
      accountId: data.accountId,
      debtId: debt._id,
      installment: { groupId: debt._id, number: i + 1, total: data.installmentsCount },
      nature: "fixed",
      paymentMethod: "boleto",
    });
  }
  await Transaction.insertMany(docs);
  await audit(userId, "debt", debt._id, "create", null, debt.toObject());
  return { id: String(debt._id) };
}

export async function updateDebt(userId: string, id: string, input: DebtUpdateInput) {
  const data = debtUpdateSchema.parse(input);
  await connectDB();
  const before = await assertOwned(Debt, userId, id, "Dívida");
  await ensureAccountUsable(userId, data.accountId);
  await Debt.updateOne({ _id: id, userId }, { $set: data });
  // Parcelas pendentes passam a sair da nova conta.
  await Transaction.updateMany({ userId, debtId: id, status: "pending" }, { $set: { accountId: data.accountId } });
  await audit(userId, "debt", id, "update", before, data);
}

/** Atualiza o status da dívida conforme as parcelas (quitada quando não há pendências). */
export async function syncDebtStatus(userId: string, id: string) {
  const debt = await Debt.findOne({ _id: id, userId });
  if (!debt || debt.status === "cancelled") return;
  const pending = await Transaction.exists({ userId, debtId: id, status: "pending" });
  const next = pending ? "active" : "paid_off";
  if (debt.status !== next) {
    debt.status = next;
    await debt.save();
  }
}

/**
 * Amortização extra: registra um pagamento efetivo e abate o valor das últimas parcelas
 * pendentes (reduz prazo), cancelando as que forem zeradas.
 */
export async function extraPayment(userId: string, id: string, input: z.input<typeof extraPaymentSchema>) {
  const data = extraPaymentSchema.parse(input);
  await connectDB();
  const debt = await assertOwned(Debt, userId, id, "Dívida");
  await ensureAccountUsable(userId, data.accountId);
  const pending = await Transaction.find({ userId, debtId: id, status: "pending" }).sort({ date: -1 });
  const outstanding = pending.reduce((s, t) => s + t.amount, 0);
  if (data.amount > outstanding) throw invalid("Valor maior que o saldo devedor.", { amount: "Excede o saldo devedor" });
  let left = data.amount;
  for (const p of pending) {
    if (left <= 0) break;
    const take = Math.min(left, p.amount);
    left -= take;
    if (take === p.amount) {
      p.status = "cancelled";
      p.notes = `${p.notes ?? ""} Quitada por amortização.`.trim();
    } else p.amount -= take;
    await p.save();
  }
  const tx = await Transaction.create({
    userId,
    kind: "expense",
    description: `Amortização — ${debt.name}`,
    amount: data.amount,
    date: data.date,
    status: "paid",
    paidAt: new Date(),
    categoryId: debt.categoryId,
    accountId: data.accountId,
    debtId: debt._id,
    nature: "variable",
  });
  await audit(userId, "transaction", tx._id, "create", null, tx.toObject());
  await syncDebtStatus(userId, id);
}

/** Sem pagamentos: exclui tudo. Com pagamentos: cancela a dívida e as pendências (histórico preservado). */
export async function deleteDebt(userId: string, id: string): Promise<"deleted" | "cancelled"> {
  await connectDB();
  const debt = await assertOwned(Debt, userId, id, "Dívida");
  const hasPaid = await Transaction.exists({ userId, debtId: id, status: "paid" });
  if (hasPaid) {
    await Transaction.updateMany({ userId, debtId: id, status: "pending" }, { $set: { status: "cancelled" } });
    await Debt.updateOne({ _id: id, userId }, { $set: { status: "cancelled" } });
    await audit(userId, "debt", id, "status", debt, { status: "cancelled" });
    return "cancelled";
  }
  await Transaction.deleteMany({ userId, debtId: id });
  await Debt.deleteOne({ _id: id, userId });
  await audit(userId, "debt", id, "delete", debt, null);
  return "deleted";
}

export async function listDebts(userId: string, tz: string) {
  await connectDB();
  const t = today(tz);
  const [debts, sums, nextRows, overdueRows] = await Promise.all([
    Debt.find({ userId }).sort({ status: 1, createdAt: -1 }).lean(),
    debtOutstanding(userId),
    Transaction.aggregate<{ _id: unknown; next: Date; last: Date; pendingCount: number }>([
      { $match: { userId: oid(userId), debtId: { $ne: null }, status: "pending" } },
      { $group: { _id: "$debtId", next: { $min: "$dueDate" }, last: { $max: "$dueDate" }, pendingCount: { $sum: 1 } } },
    ]),
    Transaction.aggregate<{ _id: unknown; n: number; total: number }>([
      { $match: { userId: oid(userId), debtId: { $ne: null }, status: "pending", dueDate: { $lt: t } } },
      { $group: { _id: "$debtId", n: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]),
  ]);
  return debts.map((d) => {
    const s = sums.get(String(d._id)) ?? { outstanding: 0, paid: 0 };
    const n = nextRows.find((r) => String(r._id) === String(d._id));
    const o = overdueRows.find((r) => String(r._id) === String(d._id));
    const paidBeforeAmount = (d.paidBefore ?? 0) * d.installmentAmount;
    const paid = s.paid + paidBeforeAmount;
    return {
      ...d,
      id: String(d._id),
      paid,
      outstanding: s.outstanding,
      progress: d.totalAmount ? Math.min(100, (paid / (paid + s.outstanding || 1)) * 100) : 0,
      nextDue: n?.next ?? null,
      payoffDate: n?.last ?? null,
      pendingCount: n?.pendingCount ?? 0,
      overdueCount: o?.n ?? 0,
      overdueAmount: o?.total ?? 0,
    };
  });
}

export async function debtInstallments(userId: string, id: string) {
  await connectDB();
  const debt = await assertOwned(Debt, userId, id, "Dívida");
  const items = await Transaction.find({ userId, debtId: id }).sort({ date: 1 }).populate("accountId", "name").lean();
  return { debt, items };
}

export async function ensureDebtExists(userId: string, id: string) {
  const d = await Debt.findOne({ _id: id, userId }).lean();
  if (!d) throw new AppError("NOT_FOUND", "Dívida não encontrada.");
  return d;
}
