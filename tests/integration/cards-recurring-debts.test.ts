import { describe, expect, it } from "vitest";
import { Recurrence, Transaction } from "@/models";
import { accountBalances, periodTotals, netWorth } from "@/modules/ledger/service";
import { cardInvoices, createCard, createPurchase, listCards, payInvoice } from "@/modules/credit-cards/service";
import { createRecurrence, ensureRecurrencesGenerated, setRecurrenceStatus, updateRecurrence } from "@/modules/recurring/service";
import { createDebt, extraPayment, listDebts, syncDebtStatus } from "@/modules/debts/service";
import { deleteTransaction, setTransactionStatus, updateTransaction } from "@/modules/transactions/service";
import { copyBudgetsFromPrevious, listBudgets, setBudget } from "@/modules/budgets/service";
import { createTransaction } from "@/modules/transactions/service";
import { parseDateOnly as d, today, toISODate } from "@/lib/dates";
import { makeAccount, makeUser } from "../support/factory";

describe("credit cards", () => {
  it("purchase is the expense; invoice payment only settles it (no double counting)", async () => {
    const { userId, cat } = await makeUser();
    const acc = await makeAccount(userId, 500000);
    const { id: card } = await createCard(userId, { name: "Roxinho", limit: 300000, closingDay: 25, dueDay: 5 });
    await createPurchase(userId, { cardId: card, description: "Notebook", amount: 300000, date: "2026-11-10", installments: 3, categoryId: await cat("Compras") });

    const installments = await Transaction.find({ userId, creditCardId: card }).sort({ date: 1 }).lean();
    expect(installments.map((i) => i.amount)).toEqual([100000, 100000, 100000]);
    expect(installments.map((i) => i.invoiceMonth)).toEqual(["2026-12", "2027-01", "2027-02"]);

    let [c] = await listCards(userId);
    expect(c.available).toBe(0);

    // Despesa de novembro = 1ª parcela; conta intacta.
    expect((await periodTotals(userId, d("2026-11-01"), d("2026-11-30"))).expense).toBe(100000);
    expect((await accountBalances(userId)).get(acc)).toBe(500000);

    await payInvoice(userId, { cardId: card, invoiceMonth: "2026-12", accountId: acc, amount: 100000, date: "2026-12-05" }, "UTC");
    // Pagamento NÃO é despesa de dezembro (dezembro só tem a 2ª parcela).
    expect((await periodTotals(userId, d("2026-12-01"), d("2026-12-31"))).expense).toBe(100000);
    expect((await accountBalances(userId)).get(acc)).toBe(400000);
    [c] = await listCards(userId);
    expect(c.available).toBe(100000);

    const inv = (await cardInvoices(userId, card, "UTC")).find((i) => i.month === "2026-12")!;
    expect(inv.status).toBe("paid");
    await expect(payInvoice(userId, { cardId: card, invoiceMonth: "2026-12", accountId: acc, amount: 1, date: "2026-12-05" }, "UTC")).rejects.toThrow(/excede/);

    // Patrimônio = conta − obrigações restantes.
    expect((await netWorth(userId)).netWorth).toBe(400000 - 200000);
  });

  it("deleting one installment removes the whole purchase", async () => {
    const { userId, cat } = await makeUser();
    const { id: card } = await createCard(userId, { name: "C", limit: 100000, closingDay: 1, dueDay: 10 });
    await createPurchase(userId, { cardId: card, description: "TV", amount: 90000, date: "2026-11-10", installments: 3, categoryId: await cat("Compras") });
    const one = await Transaction.findOne({ userId, creditCardId: card }).lean();
    await deleteTransaction(userId, String(one!._id));
    expect(await Transaction.countDocuments({ userId, creditCardId: card })).toBe(0);
  });
});

describe("recurring", () => {
  it("generation is idempotent (re-processing creates no duplicates)", async () => {
    const { userId, cat } = await makeUser();
    const acc = await makeAccount(userId);
    const start = toISODate(today("UTC"));
    const { id } = await createRecurrence(userId, { kind: "expense", description: "Aluguel", amount: 150000, categoryId: await cat("Moradia"), accountId: acc, frequency: "monthly", startDate: start, dueDay: 10 }, "UTC");
    const n1 = await Transaction.countDocuments({ recurrenceId: id });
    expect(n1).toBeGreaterThanOrEqual(1);
    await Recurrence.updateOne({ _id: id }, { $set: { generatedUntil: null } });
    await ensureRecurrencesGenerated(userId, "UTC");
    await Promise.all([ensureRecurrencesGenerated(userId, "UTC"), ensureRecurrencesGenerated(userId, "UTC")]);
    expect(await Transaction.countDocuments({ recurrenceId: id })).toBe(n1);
  });

  it("edits one occurrence, all future ones, cancels one, and pauses", async () => {
    const { userId, cat } = await makeUser();
    const acc = await makeAccount(userId);
    const input = { kind: "expense" as const, description: "Academia", amount: 10000, categoryId: await cat("Saúde"), accountId: acc, frequency: "monthly" as const, startDate: "2026-01-01", dueDay: 5 };
    const { id } = await createRecurrence(userId, input, "UTC");
    const occ = await Transaction.find({ recurrenceId: id }).sort({ occurrenceDate: 1 }).lean();
    expect(occ.length).toBeGreaterThan(3);

    // Paga a primeira; edita só a segunda; cancela a terceira.
    await setTransactionStatus(userId, String(occ[0]._id), "paid");
    await updateTransaction(userId, String(occ[1]._id), { kind: "expense", description: "Academia (promo)", amount: 5000, date: toISODate(occ[1].date), status: "pending", categoryId: input.categoryId, accountId: acc });
    expect(await deleteTransaction(userId, String(occ[2]._id))).toBe("cancelled");

    // Alterar todas as próximas: muda valor das futuras não editadas; histórico intacto.
    await updateRecurrence(userId, id, { ...input, amount: 12000 }, "UTC");
    const after = await Transaction.find({ recurrenceId: id }).sort({ occurrenceDate: 1 }).lean();
    expect(after[0].amount).toBe(10000);
    expect(after[1].amount).toBe(5000);
    expect(after[2].status).toBe("cancelled");
    const t = today("UTC");
    expect(after.filter((o) => o.occurrenceDate! >= t && o.status === "pending" && !o.overridden).every((o) => o.amount === 12000)).toBe(true);

    // Reprocessar não recria a ocorrência cancelada.
    await Recurrence.updateOne({ _id: id }, { $set: { generatedUntil: null } });
    await ensureRecurrencesGenerated(userId, "UTC");
    expect(await Transaction.countDocuments({ recurrenceId: id, occurrenceDate: occ[2].occurrenceDate })).toBe(1);

    await setRecurrenceStatus(userId, id, "paused", "UTC");
    expect(await Transaction.countDocuments({ recurrenceId: id, status: "pending", overridden: false, occurrenceDate: { $gte: t } })).toBe(0);
  });
});

describe("debts", () => {
  it("generates installments, tracks payments, amortizes and pays off", async () => {
    const { userId } = await makeUser();
    const acc = await makeAccount(userId, 1000000);
    const { id } = await createDebt(userId, { name: "Empréstimo", installmentsCount: 4, installmentAmount: 25000, paidBefore: 1, contractDate: "2026-08-01", firstDueDate: "2026-09-10", accountId: acc });
    let [debt] = await listDebts(userId, "UTC");
    expect(debt.outstanding).toBe(75000);
    expect(debt.paid).toBe(25000);

    const inst = await Transaction.find({ debtId: id }).sort({ date: 1 }).lean();
    expect(inst.map((i) => toISODate(i.date))).toEqual(["2026-10-10", "2026-11-10", "2026-12-10"]);
    await setTransactionStatus(userId, String(inst[0]._id), "paid");
    await extraPayment(userId, id, { amount: 30000, date: "2026-11-01", accountId: acc });
    [debt] = await listDebts(userId, "UTC");
    expect(debt.outstanding).toBe(20000);
    expect((await accountBalances(userId)).get(acc)).toBe(1000000 - 25000 - 30000);

    const pending = await Transaction.find({ debtId: id, status: "pending" }).lean();
    for (const p of pending) await setTransactionStatus(userId, String(p._id), "paid");
    await syncDebtStatus(userId, id);
    [debt] = await listDebts(userId, "UTC");
    expect(debt.status).toBe("paid_off");
    await expect(deleteTransaction(userId, String(inst[0]._id))).rejects.toThrow(/dívida/);
  });
});

describe("budgets", () => {
  it("rolls subcategories into the parent, counts card purchases, months are independent", async () => {
    const { userId, cat } = await makeUser();
    const acc = await makeAccount(userId);
    const food = await cat("Alimentação");
    const { Category } = await import("@/models");
    const sub = await Category.create({ userId, name: "Delivery", kind: "expense", parentId: food });
    await setBudget(userId, { categoryId: food, month: "2026-11", limit: 80000 });
    await createTransaction(userId, { kind: "expense", description: "iFood", amount: 30000, date: "2026-11-02", categoryId: String(sub._id), accountId: acc });
    const { id: card } = await createCard(userId, { name: "C", limit: 100000, closingDay: 1, dueDay: 10 });
    await createPurchase(userId, { cardId: card, description: "Mercado", amount: 32000, date: "2026-11-05", categoryId: food });

    const [b] = await listBudgets(userId, "2026-11", [50, 75, 90, 100]);
    expect(b).toMatchObject({ spent: 62000, available: 18000, threshold: 75 });

    expect(await copyBudgetsFromPrevious(userId, "2026-12")).toBe(1);
    await setBudget(userId, { categoryId: food, month: "2026-12", limit: 90000 });
    expect((await listBudgets(userId, "2026-11", [50]))[0].limit).toBe(80000);
    expect(await copyBudgetsFromPrevious(userId, "2026-12")).toBe(0);
  });
});
