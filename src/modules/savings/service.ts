import "server-only";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { AppError, invalid } from "@/lib/errors";
import { SavingsBox, Transaction, Goal } from "@/models";
import { ensureAccountUsable } from "@/modules/accounts/service";
import { savingsBalances } from "@/modules/ledger/service";
import { audit } from "@/modules/shared/audit";
import { assertOwned } from "@/modules/shared/ownership";
import { amountCents, centsAllowZero, dateOnlyString, hexColor, objectId, text } from "@/modules/shared/validation";

export const boxSchema = z.object({
  name: text(60).min(1, "Informe o nome"),
  target: centsAllowZero.nullish().transform((v) => (v ? v : null)),
  /** Valor que já estava guardado antes do cadastro (não debita nenhuma conta). */
  initialBalance: centsAllowZero.nullish().transform((v) => v ?? 0),
  color: hexColor.default("#111111"),
  icon: text(30).default("piggy-bank"),
});
export type BoxInput = z.input<typeof boxSchema>;

export const boxMoveSchema = z.object({
  boxId: objectId,
  accountId: objectId,
  amount: amountCents,
  date: dateOnlyString,
  direction: z.enum(["deposit", "withdrawal"]),
  description: text(140).optional(),
});
export type BoxMoveInput = z.input<typeof boxMoveSchema>;

export async function listBoxes(userId: string, { includeArchived = false } = {}) {
  await connectDB();
  const [boxes, balances] = await Promise.all([
    SavingsBox.find({ userId, ...(includeArchived ? {} : { archived: false }) }).sort({ createdAt: 1 }).lean(),
    savingsBalances(userId),
  ]);
  return boxes.map((b) => {
    const balance = balances.get(String(b._id)) ?? 0;
    return { ...b, id: String(b._id), balance, progress: b.target ? Math.min(100, (balance / b.target) * 100) : null };
  });
}

export async function createBox(userId: string, input: BoxInput) {
  const data = boxSchema.parse(input);
  await connectDB();
  const doc = await SavingsBox.create({ ...data, userId });
  await audit(userId, "savings_box", doc._id, "create", null, doc.toObject());
  return { id: String(doc._id) };
}

export async function updateBox(userId: string, id: string, input: BoxInput) {
  const data = boxSchema.parse(input);
  await connectDB();
  const before = await assertOwned(SavingsBox, userId, id, "Caixinha");
  // Ajustar o saldo inicial não pode deixar a caixinha negativa diante das retiradas já feitas.
  const current = (await savingsBalances(userId)).get(id) ?? 0;
  if (current - (before.initialBalance ?? 0) + data.initialBalance < 0) {
    throw invalid("Com esse saldo inicial, a caixinha ficaria negativa pelas retiradas já registradas.", { initialBalance: "Valor baixo demais" });
  }
  await SavingsBox.updateOne({ _id: id, userId }, { $set: data });
  await audit(userId, "savings_box", id, "update", before, data);
}

/**
 * Caixinha sem movimentações (só o saldo inicial do cadastro) pode ser excluída direto.
 * Com movimentações, o saldo precisa ser resgatado antes; então é arquivada para preservar o histórico.
 */
export async function deleteBox(userId: string, id: string): Promise<"deleted" | "archived"> {
  await connectDB();
  const box = await assertOwned(SavingsBox, userId, id, "Caixinha");
  const hasMoves = await Transaction.exists({ userId, savingsBoxId: id });
  const balance = (await savingsBalances(userId)).get(id) ?? 0;
  if (hasMoves && balance !== 0) throw new AppError("VALIDATION", "Retire o saldo antes de excluir a caixinha.");
  await Goal.updateMany({ userId, savingsBoxId: id }, { $set: { savingsBoxId: null } });
  if (hasMoves) {
    await SavingsBox.updateOne({ _id: id, userId }, { $set: { archived: true } });
    return "archived";
  }
  await SavingsBox.deleteOne({ _id: id, userId });
  await audit(userId, "savings_box", id, "delete", box, null);
  return "deleted";
}

/** Depósito/retirada: transferência entre conta e caixinha (não é receita nem despesa). */
export async function moveBox(userId: string, input: BoxMoveInput) {
  const data = boxMoveSchema.parse(input);
  await connectDB();
  const box = await assertOwned(SavingsBox, userId, data.boxId, "Caixinha");
  await ensureAccountUsable(userId, data.accountId);
  if (data.direction === "withdrawal") {
    const balance = (await savingsBalances(userId)).get(data.boxId) ?? 0;
    if (data.amount > balance) throw invalid("Saldo insuficiente na caixinha.", { amount: "Saldo insuficiente" });
  }
  const doc = await Transaction.create({
    userId,
    kind: data.direction === "deposit" ? "savings_deposit" : "savings_withdrawal",
    description: data.description || (data.direction === "deposit" ? `Guardado em ${box.name}` : `Resgate de ${box.name}`),
    amount: data.amount,
    date: data.date,
    status: "paid",
    paidAt: new Date(),
    accountId: data.accountId,
    savingsBoxId: box._id,
  });
  await audit(userId, "transaction", doc._id, "create", null, doc.toObject());
}

export async function deleteBoxMove(userId: string, txId: string) {
  await connectDB();
  const tx = await assertOwned(Transaction, userId, txId, "Movimentação");
  if (!["savings_deposit", "savings_withdrawal"].includes(tx.kind)) throw new AppError("VALIDATION", "Não é uma movimentação de caixinha.");
  if (tx.kind === "savings_deposit") {
    const balance = (await savingsBalances(userId)).get(String(tx.savingsBoxId)) ?? 0;
    if (balance - tx.amount < 0) throw new AppError("VALIDATION", "Estornar este depósito deixaria a caixinha negativa.");
  }
  await Transaction.deleteOne({ _id: txId, userId });
  await audit(userId, "transaction", txId, "delete", tx, null);
}

export async function boxHistory(userId: string, id: string) {
  await connectDB();
  await assertOwned(SavingsBox, userId, id, "Caixinha");
  return Transaction.find({ userId, savingsBoxId: id }).sort({ date: -1, createdAt: -1 }).limit(200).populate("accountId", "name").lean();
}
