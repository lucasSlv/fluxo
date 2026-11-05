import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import * as models from "@/models";
import { registerUser } from "@/modules/auth/service";
import { createAccount } from "@/modules/accounts/service";
import { createTransaction } from "@/modules/transactions/service";
import { createCard, createPurchase } from "@/modules/credit-cards/service";
import { createDebt } from "@/modules/debts/service";
import { createBox, moveBox } from "@/modules/savings/service";
import { createGoal } from "@/modules/goals/service";
import { createRecurrence } from "@/modules/recurring/service";
import { setBudget } from "@/modules/budgets/service";
import { deleteUserAccount } from "@/modules/settings/delete-account";

const { Category, Session, User } = models;

async function populated(email: string) {
  const { id: u } = await registerUser({ name: "Teste", email, password: "senhaForte1" }, `ip-${email}`);
  const cat = async (name: string, kind: "income" | "expense" = "expense") => String((await Category.findOne({ userId: u, name, kind }).lean())!._id);
  const acc = (await createAccount(u, { name: "C", type: "checking", initialBalance: 100000 })).id;
  const { id: tx } = await createTransaction(u, { kind: "expense", description: "x", amount: 100, date: "2026-11-01", categoryId: await cat("Outros"), accountId: acc });
  const { id: card } = await createCard(u, { name: "K", limit: 100000, closingDay: 1, dueDay: 10 });
  await createPurchase(u, { cardId: card, description: "p", amount: 3000, date: "2026-11-02", installments: 3, categoryId: await cat("Compras") });
  await createDebt(u, { name: "D", installmentsCount: 2, installmentAmount: 1000, contractDate: "2026-11-01", firstDueDate: "2026-12-01", accountId: acc });
  const { id: box } = await createBox(u, { name: "B", initialBalance: 500 });
  await moveBox(u, { boxId: box, accountId: acc, amount: 100, date: "2026-11-03", direction: "deposit" });
  await createGoal(u, { name: "G", target: 1000, startDate: "2026-11-01", savingsBoxId: box });
  await createRecurrence(u, { kind: "expense", description: "R", amount: 100, categoryId: await cat("Lazer"), accountId: acc, frequency: "monthly", startDate: "2026-10-01", dueDay: 5 }, "UTC");
  await setBudget(u, { categoryId: await cat("Lazer"), month: "2026-11", limit: 1000 });
  await Session.create({ userId: u, tokenHash: `h-${email}`, expiresAt: new Date(Date.now() + 3600_000) });
  const bucket = new GridFSBucket(mongoose.connection.db!, { bucketName: "attachments" });
  const up = bucket.openUploadStream("r.pdf", { metadata: { userId: new ObjectId(u), transactionId: new ObjectId(tx) } });
  await new Promise<void>((res, rej) => up.end(Buffer.from("pdf"), (e?: Error | null) => (e ? rej(e) : res())));
  return u;
}

async function countAll(userId: string) {
  let n = 0;
  for (const M of Object.values(models)) {
    if (typeof M !== "function" || !("countDocuments" in M) || M.modelName === "RateLimit") continue;
    n += await (M as typeof mongoose.Model).countDocuments(M.modelName === "User" ? { _id: userId } : { userId });
  }
  const files = await mongoose.connection.db!.collection("attachments.files").countDocuments({ "metadata.userId": new ObjectId(userId) });
  return n + files;
}

describe("delete my account", () => {
  it("requires the password and the typed confirmation", async () => {
    const u = await populated("a@t.dev");
    await expect(deleteUserAccount(u, { password: "errada", confirmation: "EXCLUIR" })).rejects.toThrow(/incorreta/);
    await expect(deleteUserAccount(u, { password: "senhaForte1", confirmation: "sim" })).rejects.toThrow();
    expect(await User.exists({ _id: u })).toBeTruthy();
  });

  it("erases every record of the user, keeps other users intact, and frees the email", async () => {
    const u = await populated("del@t.dev");
    const other = await populated("keep@t.dev");
    const otherBefore = await countAll(other);
    expect(await countAll(u)).toBeGreaterThan(20);

    await deleteUserAccount(u, { password: "senhaForte1", confirmation: "excluir" });

    expect(await countAll(u)).toBe(0);
    expect(await mongoose.connection.db!.collection("attachments.chunks").countDocuments({})).toBe(1); // só o anexo do outro usuário
    expect(await countAll(other)).toBe(otherBefore);
    const again = await registerUser({ name: "Novo", email: "del@t.dev", password: "senhaForte1" }, "ip-new");
    expect(again.id).not.toBe(u);
  });
});
