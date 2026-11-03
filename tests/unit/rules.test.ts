import { describe, expect, it } from "vitest";
import { effectOnAccount, effectOnSavingsBox, type LedgerTx } from "@/modules/ledger/rules";
import { firstOccurrence, monthlyEquivalent, occurrenceDates } from "@/modules/recurring/rules";
import { invoiceDates, invoiceMonthFor, invoiceStatus } from "@/modules/credit-cards/rules";
import { budgetLevel, reachedThreshold } from "@/modules/budgets/rules";
import { projectGoal } from "@/modules/goals/rules";
import { parseDateOnly as d, toISODate } from "@/lib/dates";

const A = "a".repeat(24);
const B = "b".repeat(24);

describe("ledger rules", () => {
  const tx = (o: Partial<LedgerTx>): LedgerTx => ({ kind: "expense", status: "paid", amount: 1000, accountId: A, ...o });

  it("applies effects only for paid transactions", () => {
    expect(effectOnAccount(tx({ kind: "income" }), A)).toBe(1000);
    expect(effectOnAccount(tx({ kind: "expense" }), A)).toBe(-1000);
    expect(effectOnAccount(tx({ kind: "expense", status: "pending" }), A)).toBe(0);
    expect(effectOnAccount(tx({ kind: "income", status: "cancelled" }), A)).toBe(0);
  });

  it("transfers move money between accounts without net effect", () => {
    const t = tx({ kind: "transfer", toAccountId: B });
    expect(effectOnAccount(t, A) + effectOnAccount(t, B)).toBe(0);
    expect(effectOnAccount(t, B)).toBe(1000);
  });

  it("card purchases never touch accounts; invoice payment does", () => {
    expect(effectOnAccount(tx({ kind: "expense", accountId: null, creditCardId: B }), A)).toBe(0);
    expect(effectOnAccount(tx({ kind: "card_payment", creditCardId: B }), A)).toBe(-1000);
  });

  it("savings deposits move money from account to box", () => {
    const dep = tx({ kind: "savings_deposit", savingsBoxId: B });
    expect(effectOnAccount(dep, A) + effectOnSavingsBox(dep, B)).toBe(0);
    const wd = tx({ kind: "savings_withdrawal", savingsBoxId: B });
    expect(effectOnAccount(wd, A)).toBe(1000);
    expect(effectOnSavingsBox(wd, B)).toBe(-1000);
  });
});

describe("recurrence schedule", () => {
  it("first occurrence respects due day relative to start", () => {
    expect(toISODate(firstOccurrence(d("2026-01-05"), "monthly", 10))).toBe("2026-01-10");
    expect(toISODate(firstOccurrence(d("2026-01-15"), "monthly", 10))).toBe("2026-02-10");
  });

  it("is deterministic and clamps short months", () => {
    const cfg = { startDate: d("2026-01-01"), frequency: "monthly" as const, dueDay: 31 };
    const a = occurrenceDates(cfg, d("2026-01-01"), d("2026-04-30")).map(toISODate);
    expect(a).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
    expect(occurrenceDates(cfg, d("2026-01-01"), d("2026-04-30")).map(toISODate)).toEqual(a);
  });

  it("supports weekly, quarterly and end dates", () => {
    expect(occurrenceDates({ startDate: d("2026-01-01"), frequency: "weekly", dueDay: 1 }, d("2026-01-01"), d("2026-01-31")).length).toBe(5);
    expect(occurrenceDates({ startDate: d("2026-01-01"), frequency: "quarterly", dueDay: 5 }, d("2026-01-01"), d("2026-12-31")).map(toISODate)).toEqual([
      "2026-01-05",
      "2026-04-05",
      "2026-07-05",
      "2026-10-05",
    ]);
    expect(occurrenceDates({ startDate: d("2026-01-01"), endDate: d("2026-02-15"), frequency: "monthly", dueDay: 10 }, d("2026-01-01"), d("2026-12-31")).length).toBe(2);
  });

  it("converts to monthly equivalent", () => {
    expect(monthlyEquivalent(1200, "annual")).toBe(100);
    expect(monthlyEquivalent(1000, "weekly")).toBe(4333);
  });
});

describe("credit card invoices", () => {
  // Fecha dia 25, vence dia 5 (do mês seguinte ao fechamento).
  it("assigns purchases to the right invoice", () => {
    expect(invoiceMonthFor(d("2026-11-10"), 25, 5)).toBe("2026-12");
    expect(invoiceMonthFor(d("2026-11-25"), 25, 5)).toBe("2027-01"); // no dia do fechamento -> próxima
    expect(invoiceMonthFor(d("2026-12-31"), 25, 5)).toBe("2027-02"); // fecha 25/01, vence 05/02
  });

  it("handles due day after closing day in the same month", () => {
    // Fecha dia 3, vence dia 10 do mesmo mês.
    expect(invoiceMonthFor(d("2026-11-02"), 3, 10)).toBe("2026-11");
    expect(invoiceMonthFor(d("2026-11-03"), 3, 10)).toBe("2026-12");
    const { closingDate, dueDate } = invoiceDates("2026-12", 3, 10);
    expect(toISODate(closingDate)).toBe("2026-12-03");
    expect(toISODate(dueDate)).toBe("2026-12-10");
  });

  it("computes invoice dates and status", () => {
    const { closingDate, dueDate } = invoiceDates("2026-12", 25, 5);
    expect(toISODate(closingDate)).toBe("2026-11-25");
    expect(toISODate(dueDate)).toBe("2026-12-05");
    expect(invoiceStatus({ total: 100, paid: 0, closingDate, dueDate, today: d("2026-11-20") })).toBe("open");
    expect(invoiceStatus({ total: 100, paid: 0, closingDate, dueDate, today: d("2026-11-30") })).toBe("closed");
    expect(invoiceStatus({ total: 100, paid: 0, closingDate, dueDate, today: d("2026-12-06") })).toBe("overdue");
    expect(invoiceStatus({ total: 100, paid: 100, closingDate, dueDate, today: d("2026-12-06") })).toBe("paid");
  });
});

describe("budgets", () => {
  it("detects thresholds", () => {
    expect(reachedThreshold(62000, 80000, [50, 75, 90, 100])).toBe(75);
    expect(reachedThreshold(30000, 80000, [50, 75, 90, 100])).toBeNull();
    expect(reachedThreshold(90000, 80000, [50, 75, 90, 100])).toBe(100);
    expect(budgetLevel(80000, 80000)).toBe("exceeded");
    expect(budgetLevel(72000, 80000)).toBe("critical");
  });
});

describe("goal projection", () => {
  it("projects only with a real contribution pace", () => {
    const t = d("2026-11-03");
    expect(projectGoal({ target: 100000, current: 0, contributions: [], today: t }).monthsLeft).toBeNull();
    const p = projectGoal({
      target: 100000,
      current: 40000,
      contributions: [
        { amount: 20000, date: d("2026-09-10") },
        { amount: 20000, date: d("2026-10-10") },
      ],
      today: t,
    });
    expect(p.monthlyPace).toBe(20000);
    expect(p.monthsLeft).toBe(3);
  });
});
