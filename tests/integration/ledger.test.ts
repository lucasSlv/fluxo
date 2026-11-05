import { describe, expect, it } from "vitest";
import { Transaction } from "@/models";
import { accountBalances, netWorth, periodTotals, savingsBalances } from "@/modules/ledger/service";
import { effectOnAccount } from "@/modules/ledger/rules";
import { createTransaction, deleteTransaction, listTransactions, setTransactionStatus, updateTransaction } from "@/modules/transactions/service";
import { accountStatement, deleteAccount } from "@/modules/accounts/service";
import { createBox, deleteBox, moveBox, updateBox } from "@/modules/savings/service";
import { parseDateOnly as d } from "@/lib/dates";
import { makeAccount, makeUser } from "../support/factory";

const NOV = [d("2026-11-01"), d("2026-11-30")] as const;

describe("ledger consistency", () => {
  it("balance = initial + paid effects; pending does not count", async () => {
    const { userId, cat } = await makeUser();
    const acc = await makeAccount(userId, 100000);
    await createTransaction(userId, { kind: "income", description: "Salário", amount: 500000, date: "2026-11-05", status: "paid", categoryId: await cat("Salário", "income"), accountId: acc });
    await createTransaction(userId, { kind: "expense", description: "Mercado", amount: 35050, date: "2026-11-06", status: "paid", categoryId: await cat("Alimentação"), accountId: acc });
    await createTransaction(userId, { kind: "expense", description: "Luz", amount: 20000, date: "2026-11-20", status: "pending", categoryId: await cat("Moradia"), accountId: acc });

    const balances = await accountBalances(userId);
    expect(balances.get(acc)).toBe(100000 + 500000 - 35050);

    // A agregação do MongoDB deve bater com a regra pura.
    const txs = await Transaction.find({ userId }).lean();
    expect(100000 + txs.reduce((s, t) => s + effectOnAccount(t, acc), 0)).toBe(balances.get(acc));

    const totals = await periodTotals(userId, ...NOV);
    expect(totals).toMatchObject({ income: 500000, expense: 35050, pendingExpense: 20000, result: 464950 });
  });

  it("transfers and savings moves are never income or expense", async () => {
    const { userId } = await makeUser();
    const a = await makeAccount(userId, 100000, "A");
    const b = await makeAccount(userId, 0, "B");
    await createTransaction(userId, { kind: "transfer", description: "Para B", amount: 30000, date: "2026-11-02", accountId: a, toAccountId: b });
    const { id: box } = await createBox(userId, { name: "Reserva", target: 500000 });
    await moveBox(userId, { boxId: box, accountId: a, amount: 20000, date: "2026-11-03", direction: "deposit" });
    await moveBox(userId, { boxId: box, accountId: a, amount: 5000, date: "2026-11-04", direction: "withdrawal" });

    const totals = await periodTotals(userId, ...NOV);
    expect(totals.income).toBe(0);
    expect(totals.expense).toBe(0);
    const bal = await accountBalances(userId);
    expect(bal.get(a)).toBe(100000 - 30000 - 20000 + 5000);
    expect(bal.get(b)).toBe(30000);
    expect((await savingsBalances(userId)).get(box)).toBe(15000);
    const worth = await netWorth(userId);
    expect(worth.netWorth).toBe(100000); // dinheiro só mudou de lugar
  });

  it("cannot withdraw more than the savings box holds", async () => {
    const { userId } = await makeUser();
    const a = await makeAccount(userId, 100000);
    const { id: box } = await createBox(userId, { name: "Viagem" });
    await expect(moveBox(userId, { boxId: box, accountId: a, amount: 1, date: "2026-11-03", direction: "withdrawal" })).rejects.toThrow(/insuficiente/);
  });

  it("validates category kind and ownership", async () => {
    const { userId, cat } = await makeUser();
    const other = await makeUser();
    const acc = await makeAccount(userId);
    const otherAcc = await makeAccount(other.userId);
    await expect(
      createTransaction(userId, { kind: "expense", description: "x", amount: 100, date: "2026-11-01", categoryId: await cat("Salário", "income"), accountId: acc }),
    ).rejects.toThrow(/categoria/i);
    await expect(
      createTransaction(userId, { kind: "expense", description: "x", amount: 100, date: "2026-11-01", categoryId: await cat("Lazer"), accountId: otherAcc }),
    ).rejects.toThrow(/não encontrad/);
    await expect(createTransaction(userId, { kind: "expense", description: "x", amount: 10.5, date: "2026-11-01", categoryId: await cat("Lazer"), accountId: acc })).rejects.toThrow();
  });

  it("isolates data between users", async () => {
    const u1 = await makeUser();
    const u2 = await makeUser();
    const a1 = await makeAccount(u1.userId, 0);
    const { id } = await createTransaction(u1.userId, { kind: "income", description: "Freela", amount: 1000, date: "2026-11-01", categoryId: await u1.cat("Renda extra", "income"), accountId: a1 });
    const list2 = await listTransactions(u2.userId, {}, "UTC");
    expect(list2.total).toBe(0);
    await expect(deleteTransaction(u2.userId, id)).rejects.toThrow(/não encontrad/);
    await expect(setTransactionStatus(u2.userId, id, "pending")).rejects.toThrow(/não encontrad/);
    expect(await Transaction.countDocuments({ _id: id })).toBe(1);
  });

  it("marks pending as paid and reflects it in the balance and statement", async () => {
    const { userId, cat } = await makeUser();
    const acc = await makeAccount(userId, 10000);
    const { id } = await createTransaction(userId, { kind: "expense", description: "Internet", amount: 9990, date: "2026-11-10", status: "pending", categoryId: await cat("Assinaturas"), accountId: acc });
    expect((await accountBalances(userId)).get(acc)).toBe(10000);
    await setTransactionStatus(userId, id, "paid");
    expect((await accountBalances(userId)).get(acc)).toBe(10);
    const st = await accountStatement(userId, acc, ...NOV);
    expect(st.opening).toBe(10000);
    expect(st.closing).toBe(10);
  });

  it("filters overdue, searches and paginates", async () => {
    const { userId, cat } = await makeUser();
    const acc = await makeAccount(userId);
    const c = await cat("Outros");
    for (let i = 1; i <= 25; i++) await createTransaction(userId, { kind: "expense", description: `Item ${i}`, amount: i * 100, date: "2026-11-01", categoryId: c, accountId: acc });
    await createTransaction(userId, { kind: "expense", description: "Boleto velho", amount: 5000, date: "2020-01-01", status: "pending", categoryId: c, accountId: acc });
    const p1 = await listTransactions(userId, { pageSize: "10" }, "UTC");
    expect(p1.total).toBe(26);
    expect(p1.pages).toBe(3);
    expect((await listTransactions(userId, { status: "overdue" }, "UTC")).total).toBe(1);
    expect((await listTransactions(userId, { q: "item 2" }, "UTC")).total).toBe(7); // 2, 20..25
    const sorted = await listTransactions(userId, { sort: "amount_desc", pageSize: "5" }, "UTC");
    expect(sorted.items[0].amount).toBe(5000);
  });

  it("editing keeps kind immutable and archived accounts can't be used", async () => {
    const { userId, cat } = await makeUser();
    const acc = await makeAccount(userId);
    const { id } = await createTransaction(userId, { kind: "expense", description: "A", amount: 100, date: "2026-11-01", categoryId: await cat("Outros"), accountId: acc });
    await expect(updateTransaction(userId, id, { kind: "income", description: "A", amount: 100, date: "2026-11-01", categoryId: await cat("Salário", "income"), accountId: acc })).rejects.toThrow(/tipo/);
    expect(await deleteAccount(userId, acc)).toBe("archived");
    await expect(createTransaction(userId, { kind: "expense", description: "B", amount: 100, date: "2026-11-01", categoryId: await cat("Outros"), accountId: acc })).rejects.toThrow(/arquivada/);
  });
});

describe("savings box with opening balance", () => {
  it("counts the opening balance without touching accounts or income/expense", async () => {
    const { userId } = await makeUser();
    const a = await makeAccount(userId, 100000);
    const { id: box } = await createBox(userId, { name: "Reserva antiga", initialBalance: 500000, target: 1000000 });
    expect((await savingsBalances(userId)).get(box)).toBe(500000);
    expect((await accountBalances(userId)).get(a)).toBe(100000);
    expect((await periodTotals(userId, ...NOV)).income).toBe(0);
    expect((await netWorth(userId)).savings).toBe(500000);

    await moveBox(userId, { boxId: box, accountId: a, amount: 20000, date: "2026-11-03", direction: "deposit" });
    // Pode resgatar além dos depósitos, até o total (inicial + depósitos).
    await moveBox(userId, { boxId: box, accountId: a, amount: 300000, date: "2026-11-04", direction: "withdrawal" });
    expect((await savingsBalances(userId)).get(box)).toBe(220000);
    expect((await accountBalances(userId)).get(a)).toBe(100000 - 20000 + 300000);

    // Reduzir o saldo inicial a ponto de negativar é bloqueado.
    await expect(updateBox(userId, box, { name: "Reserva antiga", initialBalance: 200000 })).rejects.toThrow(/negativa/);
    await updateBox(userId, box, { name: "Reserva antiga", initialBalance: 400000 });
    expect((await savingsBalances(userId)).get(box)).toBe(120000);
  });

  it("a box with only an opening balance can be deleted directly", async () => {
    const { userId } = await makeUser();
    const { id: box } = await createBox(userId, { name: "Cadastro errado", initialBalance: 1000 });
    expect(await deleteBox(userId, box)).toBe("deleted");
  });
});
