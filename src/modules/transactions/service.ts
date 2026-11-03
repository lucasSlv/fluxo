import "server-only";
import { isValidObjectId, type PipelineStage } from "mongoose";
import { connectDB } from "@/lib/db";
import { AppError, invalid, notFound } from "@/lib/errors";
import { parseDateOnly, today } from "@/lib/dates";
import { escapeRegex } from "@/lib/utils";
import { Category, Transaction } from "@/models";
import { ensureAccountUsable } from "@/modules/accounts/service";
import { oid } from "@/modules/ledger/rules";
import { audit } from "@/modules/shared/audit";
import { assertOwned } from "@/modules/shared/ownership";
import type { TransactionDoc } from "@/models/Transaction";
import { listFiltersSchema, transactionSchema, type ListFilters, type TransactionInput } from "./schemas";

/** Valida categoria (existe, é do usuário, tipo compatível). */
async function ensureCategory(userId: string, categoryId: string | null, kind: string) {
  if (!categoryId) return;
  const cat = await assertOwned(Category, userId, categoryId, "Categoria");
  if (cat.kind !== kind) throw invalid("A categoria não corresponde ao tipo da movimentação.", { categoryId: "Categoria incompatível" });
}

function normalize(data: ReturnType<typeof transactionSchema.parse>) {
  const pending = data.status === "pending";
  return {
    kind: data.kind,
    description: data.description,
    amount: data.amount,
    date: data.date,
    // Pendências sempre têm vencimento (padrão: a própria data) para o cálculo de atraso.
    dueDate: data.dueDate ?? (pending ? data.date : null),
    status: data.kind === "transfer" ? "paid" : data.status,
    paidAt: pending ? null : new Date(),
    categoryId: data.kind === "transfer" ? null : data.categoryId,
    accountId: data.accountId,
    toAccountId: data.kind === "transfer" ? data.toAccountId : null,
    paymentMethod: data.paymentMethod,
    nature: data.nature,
    notes: data.notes,
  };
}

export async function createTransaction(userId: string, input: TransactionInput) {
  const data = transactionSchema.parse(input);
  await connectDB();
  await ensureAccountUsable(userId, data.accountId!);
  if (data.kind === "transfer") await ensureAccountUsable(userId, data.toAccountId!);
  await ensureCategory(userId, data.categoryId, data.kind);
  const doc = await Transaction.create({ ...normalize(data), userId });
  await audit(userId, "transaction", doc._id, "create", null, doc.toObject());
  return { id: String(doc._id) };
}

export async function updateTransaction(userId: string, id: string, input: TransactionInput) {
  await connectDB();
  const current = await assertOwned(Transaction, userId, id, "Movimentação");
  if (current.creditCardId || current.debtId || current.savingsBoxId || current.kind === "card_payment") {
    throw new AppError("VALIDATION", "Edite esta movimentação pelo módulo de origem (cartão, dívida ou caixinha).");
  }
  const data = transactionSchema.parse(input);
  if (data.kind !== current.kind) throw invalid("Não é possível alterar o tipo de uma movimentação existente.", { kind: "Tipo fixo" });
  await ensureAccountUsable(userId, data.accountId!);
  if (data.kind === "transfer") await ensureAccountUsable(userId, data.toAccountId!);
  await ensureCategory(userId, data.categoryId, data.kind);
  const patch = normalize(data);
  if (current.status === "paid" && patch.status === "paid") patch.paidAt = current.paidAt ?? new Date();
  await Transaction.updateOne({ _id: id, userId }, { $set: { ...patch, overridden: current.recurrenceId ? true : current.overridden } });
  await audit(userId, "transaction", id, "update", current, patch);
}

/**
 * Exclusão consistente:
 * - ocorrência de recorrência → cancelada (impede que a geração recrie a mesma data);
 * - parcela de dívida → bloqueada (gerencie pela dívida);
 * - compra parcelada no cartão → todas as parcelas da compra.
 */
export async function deleteTransaction(userId: string, id: string): Promise<"deleted" | "cancelled"> {
  await connectDB();
  const tx = await assertOwned(Transaction, userId, id, "Movimentação");
  if (tx.debtId) throw new AppError("VALIDATION", "Parcelas de dívida são gerenciadas na página da dívida.");
  if (tx.recurrenceId) {
    await Transaction.updateOne({ _id: id, userId }, { $set: { status: "cancelled", overridden: true } });
    await audit(userId, "transaction", id, "status", tx, { status: "cancelled" });
    return "cancelled";
  }
  if (tx.creditCardId && tx.kind === "expense" && tx.installment?.groupId) {
    const group = await Transaction.find({ userId, "installment.groupId": tx.installment.groupId }).lean();
    await Transaction.deleteMany({ userId, "installment.groupId": tx.installment.groupId });
    for (const g of group) await audit(userId, "transaction", g._id, "delete", g, null);
    return "deleted";
  }
  await Transaction.deleteOne({ _id: id, userId });
  await audit(userId, "transaction", id, "delete", tx, null);
  return "deleted";
}

/** Marca como pago/pendente. Ao pagar pode-se informar data e conta efetivas. */
export async function setTransactionStatus(userId: string, id: string, status: "paid" | "pending", opts: { paidAt?: string; accountId?: string } = {}) {
  await connectDB();
  const tx = await assertOwned(Transaction, userId, id, "Movimentação");
  if (!["income", "expense"].includes(tx.kind) || tx.creditCardId) throw new AppError("VALIDATION", "Esta movimentação não possui status de pagamento.");
  if (tx.status === "cancelled") throw new AppError("VALIDATION", "Movimentação cancelada.");
  const set: Record<string, unknown> = { status };
  if (status === "paid") {
    set.paidAt = opts.paidAt ? parseDateOnly(opts.paidAt) : new Date();
    if (opts.accountId) {
      await ensureAccountUsable(userId, opts.accountId);
      set.accountId = opts.accountId;
    }
  } else {
    set.paidAt = null;
    if (!tx.dueDate) set.dueDate = tx.date;
  }
  await Transaction.updateOne({ _id: id, userId }, { $set: set });
  await audit(userId, "transaction", id, "status", tx, set);
}

export async function getTransaction(userId: string, id: string) {
  await connectDB();
  if (!isValidObjectId(id)) throw notFound("Movimentação");
  const tx = await Transaction.findOne({ _id: id, userId }).populate("categoryId", "name icon color parentId").lean();
  if (!tx) throw notFound("Movimentação");
  return tx;
}

function buildMatch(userId: string, f: ListFilters, tz: string) {
  const m: Record<string, unknown> = { userId: oid(userId) };
  if (f.from || f.to) {
    const d: Record<string, Date> = {};
    if (f.from) d.$gte = parseDateOnly(f.from);
    if (f.to) d.$lte = parseDateOnly(f.to);
    m.date = d;
  }
  if (f.kind.length) m.kind = { $in: f.kind };
  if (f.status.length) {
    const or: Record<string, unknown>[] = [];
    const plain = f.status.filter((s) => s !== "overdue");
    if (plain.length) or.push({ status: { $in: plain } });
    if (f.status.includes("overdue")) or.push({ status: "pending", dueDate: { $lt: today(tz) } });
    m.$and = [{ $or: or }];
  } else {
    m.status = { $ne: "cancelled" };
  }
  if (f.categoryId && isValidObjectId(f.categoryId)) m.$or = [{ categoryId: oid(f.categoryId) }];
  if (f.accountId && isValidObjectId(f.accountId)) {
    const accOr = [{ accountId: oid(f.accountId) }, { toAccountId: oid(f.accountId) }];
    m.$and = [...((m.$and as object[]) ?? []), { $or: accOr }];
  }
  if (f.cardId && isValidObjectId(f.cardId)) m.creditCardId = oid(f.cardId);
  if (f.nature) m.nature = f.nature;
  if (f.min != null || f.max != null) {
    const a: Record<string, number> = {};
    if (f.min != null) a.$gte = f.min;
    if (f.max != null) a.$lte = f.max;
    m.amount = a;
  }
  if (f.q) m.description = { $regex: escapeRegex(f.q), $options: "i" };
  return m;
}

export type ListedTransaction = Omit<TransactionDoc, "categoryId" | "accountId" | "toAccountId" | "creditCardId"> & {
  _id: unknown;
  categoryId: unknown;
  accountId: unknown;
  toAccountId: unknown;
  creditCardId: unknown;
};

/** Listagem paginada com filtros. Inclui subcategorias ao filtrar por categoria-mãe. */
export async function listTransactions(userId: string, rawFilters: Record<string, string | undefined>, tz: string) {
  const f = listFiltersSchema.parse(rawFilters);
  await connectDB();
  const match = buildMatch(userId, f, tz);
  if (f.categoryId && isValidObjectId(f.categoryId)) {
    const children = await Category.find({ userId, parentId: f.categoryId }).distinct("_id");
    match.$or = [{ categoryId: oid(f.categoryId) }, { categoryId: { $in: children } }];
  }
  const sort: Record<string, 1 | -1> =
    f.sort === "date_asc" ? { date: 1, _id: 1 } : f.sort === "amount_desc" ? { amount: -1, _id: -1 } : f.sort === "amount_asc" ? { amount: 1, _id: 1 } : { date: -1, _id: -1 };

  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $facet: {
        items: [{ $sort: sort }, { $skip: (f.page - 1) * f.pageSize }, { $limit: f.pageSize }],
        total: [{ $count: "n" }],
        sums: [{ $group: { _id: "$kind", total: { $sum: "$amount" } } }],
      },
    },
  ];
  const [res] = await Transaction.aggregate(pipeline);
  const total: number = res.total[0]?.n ?? 0;
  const items = (await Transaction.populate(res.items, [
    { path: "categoryId", select: "name icon color parentId" },
    { path: "accountId", select: "name color" },
    { path: "toAccountId", select: "name color" },
    { path: "creditCardId", select: "name color" },
  ])) as ListedTransaction[];
  const sums = Object.fromEntries((res.sums as { _id: string; total: number }[]).map((s) => [s._id, s.total]));
  return { items, total, page: f.page, pages: Math.max(1, Math.ceil(total / f.pageSize)), filters: f, sums };
}

/** Exportação: mesma consulta, sem paginação (limite de segurança). */
export async function exportTransactions(userId: string, rawFilters: Record<string, string | undefined>, tz: string) {
  const f = listFiltersSchema.parse({ ...rawFilters, page: 1, pageSize: 100 });
  await connectDB();
  return Transaction.find(buildMatch(userId, f, tz))
    .sort({ date: 1 })
    .limit(20000)
    .populate("categoryId", "name")
    .populate("accountId", "name")
    .populate("toAccountId", "name")
    .populate("creditCardId", "name")
    .lean();
}

export async function transactionHistory(userId: string, id: string) {
  await connectDB();
  const { AuditLog } = await import("@/models");
  return AuditLog.find({ userId, entity: "transaction", entityId: id }).sort({ createdAt: -1 }).limit(50).lean();
}
