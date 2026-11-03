import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { AppError, invalid } from "@/lib/errors";
import { addMonths, monthKey, today, type MonthKey } from "@/lib/dates";
import { splitInstallments } from "@/lib/money";
import { Category, CreditCard, Transaction } from "@/models";
import { ensureAccountUsable } from "@/modules/accounts/service";
import { cardOutstanding } from "@/modules/ledger/service";
import { oid } from "@/modules/ledger/rules";
import { audit } from "@/modules/shared/audit";
import { assertOwned } from "@/modules/shared/ownership";
import { invoiceDates, invoiceMonthFor, invoiceStatus, type InvoiceStatus } from "./rules";
import { cardSchema, invoicePaymentSchema, purchaseSchema, type CardInput, type InvoicePaymentInput, type PurchaseInput } from "./schemas";

export async function listCards(userId: string, { includeArchived = false } = {}) {
  await connectDB();
  const [cards, outstanding] = await Promise.all([
    CreditCard.find({ userId, ...(includeArchived ? {} : { archived: false }) }).sort({ createdAt: 1 }).lean(),
    cardOutstanding(userId),
  ]);
  return cards.map((c) => {
    const used = Math.max(0, outstanding.get(String(c._id)) ?? 0);
    return { ...c, id: String(c._id), used, available: c.limit - used };
  });
}

export async function createCard(userId: string, input: CardInput) {
  const data = cardSchema.parse(input);
  await connectDB();
  if (data.defaultAccountId) await ensureAccountUsable(userId, data.defaultAccountId);
  const doc = await CreditCard.create({ ...data, userId });
  await audit(userId, "card", doc._id, "create", null, doc.toObject());
  return { id: String(doc._id) };
}

/** Alterar dias de fechamento/vencimento vale para compras futuras; as já lançadas mantêm sua fatura. */
export async function updateCard(userId: string, id: string, input: CardInput) {
  const data = cardSchema.parse(input);
  await connectDB();
  const before = await assertOwned(CreditCard, userId, id, "Cartão");
  if (data.defaultAccountId) await ensureAccountUsable(userId, data.defaultAccountId);
  await CreditCard.updateOne({ _id: id, userId }, { $set: data });
  await audit(userId, "card", id, "update", before, data);
}

export async function deleteCard(userId: string, id: string): Promise<"deleted" | "archived"> {
  await connectDB();
  const card = await assertOwned(CreditCard, userId, id, "Cartão");
  if (await Transaction.exists({ userId, creditCardId: id })) {
    await CreditCard.updateOne({ _id: id, userId }, { $set: { archived: !card.archived } });
    return "archived";
  }
  await CreditCard.deleteOne({ _id: id, userId });
  await audit(userId, "card", id, "delete", card, null);
  return "deleted";
}

/**
 * Registra uma compra (à vista ou parcelada). Cada parcela é uma despesa na sua fatura,
 * com competência na data da parcela. Nenhuma afeta saldo de conta.
 */
export async function createPurchase(userId: string, input: PurchaseInput) {
  const data = purchaseSchema.parse(input);
  await connectDB();
  const card = await assertOwned(CreditCard, userId, data.cardId, "Cartão");
  if (card.archived) throw invalid("Cartão arquivado.", { cardId: "Cartão arquivado" });
  const cat = await assertOwned(Category, userId, data.categoryId, "Categoria");
  if (cat.kind !== "expense") throw invalid("Use uma categoria de despesa.", { categoryId: "Categoria incompatível" });

  const amounts = splitInstallments(data.amount, data.installments);
  const firstInvoice = invoiceMonthFor(data.date, card.closingDay, card.dueDay);
  const groupId = new Types.ObjectId();
  const docs = amounts.map((amount, i) => ({
    userId,
    kind: "expense",
    description: data.installments > 1 ? `${data.description} (${i + 1}/${data.installments})` : data.description,
    amount,
    date: addMonths(data.date, i),
    status: "paid",
    paidAt: new Date(),
    categoryId: data.categoryId,
    creditCardId: card._id,
    invoiceMonth: monthKey(addMonths(new Date(`${firstInvoice}-01T00:00:00Z`), i)),
    installment: { groupId, number: i + 1, total: data.installments },
    paymentMethod: "credit",
    nature: data.nature,
    notes: data.notes,
  }));
  const created = await Transaction.insertMany(docs);
  for (const d of created) await audit(userId, "transaction", d._id, "create", null, d.toObject());
  return { groupId: String(groupId), firstInvoice };
}

export type Invoice = {
  month: MonthKey;
  closingDate: Date;
  dueDate: Date;
  total: number;
  paid: number;
  remaining: number;
  status: InvoiceStatus;
};

/** Faturas do cartão derivadas das compras e pagamentos (sem estado duplicado). */
export async function cardInvoices(userId: string, cardId: string, tz: string): Promise<Invoice[]> {
  await connectDB();
  const card = await assertOwned(CreditCard, userId, cardId, "Cartão");
  const rows = await Transaction.aggregate<{ _id: string; charges: number; payments: number }>([
    { $match: { userId: oid(userId), creditCardId: oid(cardId), status: { $ne: "cancelled" }, invoiceMonth: { $ne: null } } },
    {
      $group: {
        _id: "$invoiceMonth",
        charges: { $sum: { $cond: [{ $eq: ["$kind", "expense"] }, "$amount", 0] } },
        payments: { $sum: { $cond: [{ $eq: ["$kind", "card_payment"] }, "$amount", 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const t = today(tz);
  const current = invoiceMonthFor(t, card.closingDay, card.dueDay);
  const months = new Set(rows.map((r) => r._id));
  months.add(current);
  return [...months].sort().map((month) => {
    const r = rows.find((x) => x._id === month);
    const { closingDate, dueDate } = invoiceDates(month, card.closingDay, card.dueDay);
    const total = r?.charges ?? 0;
    const paid = r?.payments ?? 0;
    return {
      month,
      closingDate,
      dueDate,
      total,
      paid,
      remaining: Math.max(0, total - paid),
      status: invoiceStatus({ total, paid, closingDate, dueDate, today: t, isFirstOpen: month <= current }),
    };
  });
}

export async function invoiceItems(userId: string, cardId: string, month: MonthKey) {
  await connectDB();
  await assertOwned(CreditCard, userId, cardId, "Cartão");
  return Transaction.find({ userId, creditCardId: cardId, invoiceMonth: month, status: { $ne: "cancelled" } })
    .sort({ kind: 1, date: 1 })
    .populate("categoryId", "name icon color")
    .populate("accountId", "name")
    .lean();
}

/** Liquidação da fatura: sai da conta, abate a obrigação. Não é despesa. */
export async function payInvoice(userId: string, input: InvoicePaymentInput, tz: string) {
  const data = invoicePaymentSchema.parse(input);
  await connectDB();
  const card = await assertOwned(CreditCard, userId, data.cardId, "Cartão");
  await ensureAccountUsable(userId, data.accountId);
  const inv = (await cardInvoices(userId, data.cardId, tz)).find((i) => i.month === data.invoiceMonth);
  if (!inv || inv.total === 0) throw new AppError("VALIDATION", "Fatura sem lançamentos.");
  if (data.amount > inv.remaining) throw invalid("O valor excede o saldo da fatura.", { amount: `Máximo ${(inv.remaining / 100).toFixed(2)}` });
  const doc = await Transaction.create({
    userId,
    kind: "card_payment",
    description: `Pagamento fatura ${card.name} ${data.invoiceMonth}`,
    amount: data.amount,
    date: data.date,
    status: "paid",
    paidAt: new Date(),
    accountId: data.accountId,
    creditCardId: card._id,
    invoiceMonth: data.invoiceMonth,
    paymentMethod: "transfer",
    nature: "variable",
  });
  await audit(userId, "transaction", doc._id, "create", null, doc.toObject());
}

/** Estorna um pagamento de fatura. */
export async function deleteInvoicePayment(userId: string, txId: string) {
  await connectDB();
  const tx = await assertOwned(Transaction, userId, txId, "Pagamento");
  if (tx.kind !== "card_payment") throw new AppError("VALIDATION", "Não é um pagamento de fatura.");
  await Transaction.deleteOne({ _id: txId, userId });
  await audit(userId, "transaction", txId, "delete", tx, null);
}

/** Parcelas futuras (todas as faturas após a atual). */
export async function upcomingCardInstallments(userId: string, tz: string, limit = 50) {
  await connectDB();
  return Transaction.find({ userId, kind: "expense", creditCardId: { $ne: null }, "installment.total": { $gt: 1 }, date: { $gt: today(tz) } })
    .sort({ date: 1 })
    .limit(limit)
    .populate("creditCardId", "name color")
    .lean();
}
