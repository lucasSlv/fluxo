import { addMonths, dateOnly, daysInMonth, monthKey, parseMonthKey, type MonthKey } from "@/lib/dates";

/** Data de fechamento da fatura em um mês (dia ajustado ao tamanho do mês). */
export function closingDateIn(y: number, m: number, closingDay: number): Date {
  return dateOnly(y, m, Math.min(closingDay, daysInMonth(y, m)));
}

/**
 * Fatura (identificada pelo mês de VENCIMENTO, "YYYY-MM") em que cai uma compra.
 * Compras feitas no dia do fechamento ou depois entram na fatura seguinte.
 */
export function invoiceMonthFor(purchaseDate: Date, closingDay: number, dueDay: number): MonthKey {
  const y = purchaseDate.getUTCFullYear();
  const m = purchaseDate.getUTCMonth() + 1;
  let closing = closingDateIn(y, m, closingDay);
  if (purchaseDate >= closing) closing = addMonths(dateOnly(y, m, 1), 1);
  const closingMonth = monthKey(closing);
  // Se o vencimento é em dia menor/igual ao fechamento, ele ocorre no mês seguinte ao fechamento.
  return dueDay <= closingDay ? monthKey(addMonths(parseMk(closingMonth), 1)) : closingMonth;
}

const parseMk = (k: MonthKey) => {
  const { y, m } = parseMonthKey(k);
  return dateOnly(y, m, 1);
};

/** Datas de fechamento e vencimento de uma fatura. */
export function invoiceDates(invoiceMonth: MonthKey, closingDay: number, dueDay: number) {
  const { y, m } = parseMonthKey(invoiceMonth);
  const dueDate = dateOnly(y, m, Math.min(dueDay, daysInMonth(y, m)));
  const closingBase = dueDay <= closingDay ? addMonths(dateOnly(y, m, 1), -1) : dateOnly(y, m, 1);
  const closingDate = closingDateIn(closingBase.getUTCFullYear(), closingBase.getUTCMonth() + 1, closingDay);
  return { closingDate, dueDate };
}

export type InvoiceStatus = "open" | "closed" | "paid" | "overdue" | "future";

export function invoiceStatus(args: { total: number; paid: number; closingDate: Date; dueDate: Date; today: Date; isFirstOpen?: boolean }): InvoiceStatus {
  const { total, paid, closingDate, dueDate, today } = args;
  if (total > 0 && paid >= total) return "paid";
  if (total <= 0 && today >= closingDate) return "paid";
  if (today < closingDate) return args.isFirstOpen === false ? "future" : "open";
  if (today > dueDate) return "overdue";
  return "closed";
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  open: "Aberta",
  future: "Futura",
  closed: "Fechada",
  paid: "Paga",
  overdue: "Vencida",
};
