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
async function validatePurchase(userId: string, data: ReturnType<typeof purchaseSchema.parse>) {
  const card = await assertOwned(CreditCard, userId, data.cardId, "Cartão");
  if (card.archived) throw invalid("Cartão arquivado.", { cardId: "Cartão arquivado" });
  const cat = await assertOwned(Category, userId, data.categoryId, "Categoria");
  if (cat.kind !== "expense") throw invalid("Use uma categoria de despesa.", { categoryId: "Categoria incompatível" });
  return card;
}

/** Monta as parcelas de uma compra: cada uma na sua fatura, com competência na data da parcela. */
function purchaseDocs(userId: string, data: ReturnType<typeof purchaseSchema.parse>, card: { _id: unknown; closingDay: number; dueDay: number }, groupId: Types.ObjectId) {
  const amounts = splitInstallments(data.amount, data.installments);
  const firstInvoice = invoiceMonthFor(data.date, card.closingDay, card.dueDay);
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
  return { docs, firstInvoice };
}

export async function createPurchase(userId: string, input: PurchaseInput) {
  const data = purchaseSchema.parse(input);
  await connectDB();
  const card = await validatePurchase(userId, data);
  const groupId = new Types.ObjectId();
  const { docs, firstInvoice } = purchaseDocs(userId, data, card, groupId);
  const created = await Transaction.insertMany(docs);
  for (const d of created) await audit(userId, "transaction", d._id, "create", null, d.toObject());
  return { groupId: String(groupId), firstInvoice };
}

/** Remove o sufixo " (2/10)" que as parcelas recebem. */
const baseDescription = (s: string) => s.replace(/\s\(\d+\/\d+\)$/, "");

/** Parcelas da compra a que uma movimentação de cartão pertence (compras recorrentes não entram). */
async function purchaseGroup(userId: string, txId: string) {
  const tx = await assertOwned(Transaction, userId, txId, "Compra");
  if (tx.kind !== "expense" || !tx.creditCardId || tx.recurrenceId) throw new AppError("VALIDATION", "Esta movimentação não é uma compra no cartão.");
  const items = tx.installment?.groupId
    ? await Transaction.find({ userId, "installment.groupId": tx.installment.groupId }).sort({ "installment.number": 1 }).lean()
    : [tx];
  return { tx, items };
}

/** Dados da compra como foram lançados (valor total, data da 1ª parcela, nº de parcelas). */
export async function getPurchase(userId: string, txId: string) {
  await connectDB();
  const { items } = await purchaseGroup(userId, txId);
  const first = items[0];
  return {
    cardId: String(first.creditCardId),
    description: baseDescription(first.description),
    amount: items.reduce((s, i) => s + i.amount, 0),
    date: first.date.toISOString().slice(0, 10),
    installments: items.length,
    categoryId: first.categoryId ? String(first.categoryId) : "",
    nature: (first.nature ?? "variable") as "fixed" | "variable",
    notes: first.notes ?? "",
  };
}

/**
 * Corrige uma compra no cartão: todas as parcelas são recalculadas (valor, datas, faturas, nº de parcelas,
 * cartão). Mantém o mesmo identificador da compra e registra o histórico. Pagamentos de fatura já feitos
 * não são alterados — se a fatura ficar com valor pago maior que o total, o excedente aparece como crédito.
 */
export async function updatePurchase(userId: string, txId: string, input: PurchaseInput) {
  const data = purchaseSchema.parse(input);
  await connectDB();
  const { tx, items } = await purchaseGroup(userId, txId);
  const card = await validatePurchase(userId, data);
  const groupId = (tx.installment?.groupId as Types.ObjectId | null) ?? new Types.ObjectId();
  const { docs } = purchaseDocs(userId, data, card, groupId);
  // Insere as novas parcelas antes de remover as antigas: em caso de falha, nada se perde.
  const created = await Transaction.insertMany(docs);
  await Transaction.deleteMany({ userId, _id: { $in: items.map((i) => i._id) } });
  for (const old of items) await audit(userId, "transaction", old._id, "delete", old, null);
  for (const d of created) await audit(userId, "transaction", d._id, "create", null, d.toObject());
  return { id: String(created[0]._id) };
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

/** Cobranças futuras no cartão: parcelas de compras e recorrências (assinaturas). */
export async function upcomingCardInstallments(userId: string, tz: string, limit = 50) {
  await connectDB();
  return Transaction.find({
    userId,
    kind: "expense",
    creditCardId: { $ne: null },
    status: { $ne: "cancelled" },
    $or: [{ "installment.total": { $gt: 1 } }, { recurrenceId: { $ne: null } }],
    date: { $gt: today(tz) },
  })
    .sort({ date: 1 })
    .limit(limit)
    .populate("creditCardId", "name color")
    .lean();
}
