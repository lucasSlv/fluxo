import "server-only";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { Account, Transaction } from "@/models";
import { accountBalances } from "@/modules/ledger/service";
import { effectOnAccount, oid } from "@/modules/ledger/rules";
import { audit } from "@/modules/shared/audit";
import { assertOwned } from "@/modules/shared/ownership";
import { accountSchema, type AccountInput } from "./schemas";

export async function listAccounts(userId: string, { includeArchived = false } = {}) {
  await connectDB();
  const [accounts, balances] = await Promise.all([
    Account.find({ userId, ...(includeArchived ? {} : { archived: false }) }).sort({ createdAt: 1 }).lean(),
    accountBalances(userId),
  ]);
  return accounts.map((a) => ({ ...a, id: String(a._id), balance: balances.get(String(a._id)) ?? a.initialBalance }));
}

export async function createAccount(userId: string, input: AccountInput) {
  const data = accountSchema.parse(input);
  await connectDB();
  const doc = await Account.create({ ...data, userId });
  await audit(userId, "account", doc._id, "create", null, doc.toObject());
  return { id: String(doc._id) };
}

export async function updateAccount(userId: string, id: string, input: AccountInput) {
  const data = accountSchema.parse(input);
  await connectDB();
  const before = await assertOwned(Account, userId, id, "Conta");
  await Account.updateOne({ _id: id, userId }, { $set: data });
  await audit(userId, "account", id, "update", before, data);
}

/** Exclui se não houver movimentações; caso contrário arquiva (preserva o histórico). */
export async function deleteAccount(userId: string, id: string): Promise<"deleted" | "archived"> {
  await connectDB();
  const acc = await assertOwned(Account, userId, id, "Conta");
  const used = await Transaction.exists({ userId, $or: [{ accountId: id }, { toAccountId: id }] });
  if (used) {
    await Account.updateOne({ _id: id, userId }, { $set: { archived: !acc.archived } });
    return "archived";
  }
  await Account.deleteOne({ _id: id, userId });
  await audit(userId, "account", id, "delete", acc, null);
  return "deleted";
}

/** Extrato da conta com saldo acumulado (somente movimentações efetivadas). */
export async function accountStatement(userId: string, id: string, from: Date, to: Date) {
  await connectDB();
  const acc = await assertOwned(Account, userId, id, "Conta");
  const accountFilter = { $or: [{ accountId: oid(id) }, { toAccountId: oid(id) }] };
  const [before, rows] = await Promise.all([
    Transaction.find({ userId, status: "paid", date: { $lt: from }, ...accountFilter }).select("kind status amount accountId toAccountId creditCardId").lean(),
    Transaction.find({ userId, status: "paid", date: { $gte: from, $lte: to }, ...accountFilter })
      .sort({ date: 1, createdAt: 1 })
      .populate("categoryId", "name icon color")
      .lean(),
  ]);
  const opening = acc.initialBalance + before.reduce((s, t) => s + effectOnAccount(t, id), 0);
  let running = opening;
  const lines = rows.map((t) => {
    const delta = effectOnAccount(t, id);
    running += delta;
    return { ...t, delta, balance: running };
  });
  return { account: acc, opening, closing: running, lines };
}

export async function ensureAccountUsable(userId: string, id: string) {
  const acc = await assertOwned(Account, userId, id, "Conta");
  if (acc.archived) throw new AppError("VALIDATION", "Esta conta está arquivada.", { accountId: "Conta arquivada" });
  return acc;
}
