import { describe, expect, it } from "vitest";
import { Recurrence, Transaction } from "@/models";
import { accountBalances, periodTotals } from "@/modules/ledger/service";
import { cardInvoices, createCard, listCards, payInvoice } from "@/modules/credit-cards/service";
import { createRecurrence, ensureRecurrencesGenerated, setRecurrenceStatus, updateRecurrence } from "@/modules/recurring/service";
import { deleteTransaction, updateTransaction } from "@/modules/transactions/service";
import { invoiceMonthFor } from "@/modules/credit-cards/rules";
import { addMonths, dateOnly, monthKey, monthRange, today, toISODate } from "@/lib/dates";
import { makeAccount, makeUser } from "../support/factory";

const TZ = "UTC";

async function setup() {
  const { userId, cat } = await makeUser();
  const acc = await makeAccount(userId, 100000);
  const { id: card } = await createCard(userId, { name: "Cartão", limit: 50000, closingDay: 25, dueDay: 5 });
  const t = today(TZ);
  const start = addMonths(dateOnly(t.getUTCFullYear(), t.getUTCMonth() + 1, 1), -3);
  const input = {
    kind: "expense" as const,
    description: "Academia",
    amount: 9900,
    categoryId: await cat("Saúde"),
    creditCardId: card,
    frequency: "monthly" as const,
    startDate: toISODate(start),
    dueDay: 10,
  };
  const { id } = await createRecurrence(userId, input, TZ);
  return { userId, acc, card, id, input, t, cat };
}

describe("recurring charges on a credit card", () => {
  it("creates card charges in the right invoice; past ones effective, future ones forecast", async () => {
    const { card, id, t } = await setup();
    const occ = await Transaction.find({ recurrenceId: id }).sort({ date: 1 }).lean();
    expect(occ.length).toBeGreaterThanOrEqual(4);
    for (const o of occ) {
      expect(String(o.creditCardId)).toBe(card);
      expect(o.accountId).toBeNull();
      expect(o.dueDate).toBeNull();
      expect(o.paymentMethod).toBe("credit");
      expect(o.invoiceMonth).toBe(invoiceMonthFor(o.date, 25, 5));
      expect(o.status).toBe(o.date <= t ? "paid" : "pending");
    }
  });

  it("never touches account balance and is counted once (purchase, not invoice payment)", async () => {
    const { userId, acc, card, id } = await setup();
    const past = await Transaction.findOne({ recurrenceId: id, status: "paid" }).sort({ date: 1 }).lean();
    const { from, to } = monthRange(monthKey(past!.date));
    expect((await periodTotals(userId, from, to)).expense).toBe(9900);
    expect((await accountBalances(userId)).get(acc)).toBe(100000);

    await payInvoice(userId, { cardId: card, invoiceMonth: past!.invoiceMonth!, accountId: acc, amount: 9900, date: toISODate(past!.date) }, TZ);
    expect((await accountBalances(userId)).get(acc)).toBe(100000 - 9900);
    // O pagamento da fatura não vira uma segunda despesa.
    expect((await periodTotals(userId, from, to)).expense).toBe(9900);
    const inv = (await cardInvoices(userId, card, TZ)).find((i) => i.month === past!.invoiceMonth);
    expect(inv!.paid).toBe(9900);
  });

  it("only effective charges consume the card limit", async () => {
    const { userId, id } = await setup();
    const paidCount = await Transaction.countDocuments({ recurrenceId: id, status: "paid" });
    const [card] = await listCards(userId);
    expect(card.used).toBe(paidCount * 9900);
  });

  it("forecast charges become effective when their date arrives", async () => {
    const { userId, id, t } = await setup();
    const future = await Transaction.findOne({ recurrenceId: id, status: "pending" }).lean();
    expect(future).toBeTruthy();
    // Simula a passagem do tempo trazendo a ocorrência para hoje.
    await Transaction.updateOne({ _id: future!._id }, { $set: { date: t } });
    await ensureRecurrencesGenerated(userId, TZ);
    expect((await Transaction.findById(future!._id).lean())!.status).toBe("paid");
  });

  it("is idempotent on reprocessing", async () => {
    const { userId, id } = await setup();
    const n = await Transaction.countDocuments({ recurrenceId: id });
    await Recurrence.updateOne({ _id: id }, { $set: { generatedUntil: null } });
    await Promise.all([ensureRecurrencesGenerated(userId, TZ), ensureRecurrencesGenerated(userId, TZ)]);
    expect(await Transaction.countDocuments({ recurrenceId: id })).toBe(n);
  });

  it("edits one occurrence (recomputing the invoice) and all upcoming ones", async () => {
    const { userId, id, input, t } = await setup();
    const [first, second] = await Transaction.find({ recurrenceId: id }).sort({ date: 1 }).lean();
    const newDate = toISODate(addMonths(first.date, 0, 27)); // depois do fechamento: muda de fatura
    await updateTransaction(
      userId,
      String(first._id),
      { kind: "expense", description: "Academia (reajuste)", amount: 12000, date: newDate, categoryId: input.categoryId, accountId: "" },
      TZ,
    );
    const edited = (await Transaction.findById(first._id).lean())!;
    expect(edited).toMatchObject({ amount: 12000, overridden: true, invoiceMonth: invoiceMonthFor(edited.date, 25, 5) });
    expect(edited.invoiceMonth).not.toBe(first.invoiceMonth);

    await updateRecurrence(userId, id, { ...input, amount: 10900 }, TZ);
    const after = await Transaction.find({ recurrenceId: id }).sort({ date: 1 }).lean();
    expect(after.find((o) => String(o._id) === String(first._id))!.amount).toBe(12000); // editada individualmente
    expect(after.find((o) => String(o._id) === String(second._id))!.amount).toBe(9900); // já cobrada
    expect(after.filter((o) => o.status === "pending").every((o) => o.amount === 10900 && o.date > t)).toBe(true);
  });

  it("cancels a single occurrence and pausing removes forecast charges", async () => {
    const { userId, id } = await setup();
    const future = await Transaction.findOne({ recurrenceId: id, status: "pending" }).lean();
    expect(await deleteTransaction(userId, String(future!._id))).toBe("cancelled");
    await setRecurrenceStatus(userId, id, "paused", TZ);
    expect(await Transaction.countDocuments({ recurrenceId: id, status: "pending" })).toBe(0);
    expect(await Transaction.countDocuments({ recurrenceId: id, status: "paid" })).toBeGreaterThan(0);
  });

  it("switching from card to account regenerates upcoming occurrences as account bills", async () => {
    const { userId, acc, id, input } = await setup();
    await updateRecurrence(userId, id, { ...input, creditCardId: null, accountId: acc, paymentMethod: "debit" }, TZ);
    const pending = await Transaction.find({ recurrenceId: id, status: "pending" }).lean();
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((o) => !o.creditCardId && String(o.accountId) === acc && o.dueDate)).toBe(true);
  });

  it("validates the payment target", async () => {
    const { userId, acc, card, input } = await setup();
    await expect(createRecurrence(userId, { ...input, kind: "income" }, TZ)).rejects.toThrow();
    await expect(createRecurrence(userId, { ...input, accountId: acc }, TZ)).rejects.toThrow();
    await expect(createRecurrence(userId, { ...input, creditCardId: null }, TZ)).rejects.toThrow();
    const other = await makeUser();
    await expect(createRecurrence(other.userId, { ...input, categoryId: await other.cat("Saúde"), creditCardId: card }, TZ)).rejects.toThrow(/não encontrad/);
  });
});
