import "server-only";
import { connectDB } from "@/lib/db";
import { monthRange, today, type MonthKey } from "@/lib/dates";
import { CreditCard, Transaction } from "@/models";
import { cardInvoices } from "@/modules/credit-cards/service";
import { ensureRecurrencesGenerated } from "@/modules/recurring/service";

export type CalendarEventType = "bill_due" | "bill_paid" | "bill_overdue" | "income_expected" | "income_received" | "card_invoice" | "card_installment" | "debt" | "recurring";

export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  title: string;
  amount: number;
  status: string;
  href?: string;
};

export const EVENT_STYLE: Record<CalendarEventType, { label: string; dot: string; chip: string }> = {
  bill_due: { label: "Conta a vencer", dot: "bg-warn", chip: "bg-warn-soft text-amber-900" },
  bill_overdue: { label: "Conta atrasada", dot: "bg-neg", chip: "bg-neg-soft text-red-900" },
  bill_paid: { label: "Conta paga", dot: "bg-ink-4", chip: "bg-muted text-ink-3 line-through decoration-ink-4" },
  income_expected: { label: "Receita prevista", dot: "bg-info", chip: "bg-info-soft text-blue-900" },
  income_received: { label: "Receita recebida", dot: "bg-pos", chip: "bg-pos-soft text-green-900" },
  card_invoice: { label: "Fatura do cartão", dot: "bg-ink", chip: "bg-ink text-white" },
  card_installment: { label: "Parcela de cartão", dot: "bg-violet-500", chip: "bg-violet-100 text-violet-900" },
  debt: { label: "Parcela de dívida", dot: "bg-slate-500", chip: "bg-slate-200 text-slate-900" },
  recurring: { label: "Despesa recorrente", dot: "bg-orange-400", chip: "bg-orange-100 text-orange-900" },
};

export async function calendarEvents(userId: string, month: MonthKey, tz: string): Promise<CalendarEvent[]> {
  await connectDB();
  await ensureRecurrencesGenerated(userId, tz);
  const { from, to } = monthRange(month);
  const t = today(tz);
  const txs = await Transaction.find({
    userId,
    kind: { $in: ["income", "expense"] },
    status: { $ne: "cancelled" },
    $or: [{ dueDate: { $gte: from, $lte: to } }, { dueDate: null, date: { $gte: from, $lte: to } }],
  })
    .select("kind description amount date dueDate status creditCardId debtId recurrenceId installment")
    .lean();

  const events: CalendarEvent[] = [];
  for (const tx of txs) {
    // Compras no cartão aparecem pela fatura; só parcelas (2+) aparecem individualmente.
    if (tx.creditCardId && !(tx.installment?.total && tx.installment.total > 1)) continue;
    const d = (tx.dueDate ?? tx.date).toISOString().slice(0, 10);
    let type: CalendarEventType;
    if (tx.kind === "income") type = tx.status === "paid" ? "income_received" : "income_expected";
    else if (tx.creditCardId) type = "card_installment";
    else if (tx.status === "paid") type = "bill_paid";
    else if ((tx.dueDate ?? tx.date) < t) type = "bill_overdue";
    else if (tx.debtId) type = "debt";
    else if (tx.recurrenceId) type = "recurring";
    else type = "bill_due";
    events.push({ id: String(tx._id), date: d, type, title: tx.description, amount: tx.amount, status: tx.status, href: tx.debtId ? `/debts/${tx.debtId}` : undefined });
  }

  const cards = await CreditCard.find({ userId, archived: false }).select("name").lean();
  for (const c of cards) {
    const inv = (await cardInvoices(userId, String(c._id), tz)).find((i) => i.month === month);
    if (inv && inv.total > 0)
      events.push({
        id: `inv-${c._id}-${month}`,
        date: inv.dueDate.toISOString().slice(0, 10),
        type: inv.status === "paid" ? "bill_paid" : "card_invoice",
        title: `Fatura ${c.name}`,
        amount: inv.total,
        status: inv.status,
        href: `/cards/${c._id}?invoice=${month}`,
      });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}
