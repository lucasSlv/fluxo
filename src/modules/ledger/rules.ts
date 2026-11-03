/**
 * Regras de contabilização — fonte única para saldos, dashboard, relatórios e insights.
 *
 * - Receita: kind=income. Despesa: kind=expense (de conta OU de cartão).
 * - transfer, card_payment e savings_* nunca são receita/despesa.
 * - "Realizado" = status paid. "Previsto" = status pending. cancelled é ignorado.
 * - Compras no cartão nascem com status paid (a obrigação existe) e não afetam conta;
 *   o pagamento da fatura (card_payment) só liquida a obrigação.
 */
import { Types } from "mongoose";
import type { TxKind, TxStatus } from "@/models/Transaction";

export type LedgerTx = {
  kind: TxKind;
  status: TxStatus;
  amount: number;
  accountId?: Types.ObjectId | string | null;
  toAccountId?: Types.ObjectId | string | null;
  creditCardId?: Types.ObjectId | string | null;
  savingsBoxId?: Types.ObjectId | string | null;
};

const eq = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);

/** Efeito (em centavos) de uma transação efetivada sobre o saldo de uma conta. */
export function effectOnAccount(tx: LedgerTx, accountId: string): number {
  if (tx.status !== "paid") return 0;
  switch (tx.kind) {
    case "income":
      return eq(tx.accountId, accountId) ? tx.amount : 0;
    case "expense":
      return eq(tx.accountId, accountId) && !tx.creditCardId ? -tx.amount : 0;
    case "transfer":
      return (eq(tx.toAccountId, accountId) ? tx.amount : 0) - (eq(tx.accountId, accountId) ? tx.amount : 0);
    case "card_payment":
    case "savings_deposit":
      return eq(tx.accountId, accountId) ? -tx.amount : 0;
    case "savings_withdrawal":
      return eq(tx.accountId, accountId) ? tx.amount : 0;
  }
}

/** Efeito sobre o saldo de uma caixinha. */
export function effectOnSavingsBox(tx: LedgerTx, boxId: string): number {
  if (tx.status !== "paid" || !eq(tx.savingsBoxId, boxId)) return 0;
  if (tx.kind === "savings_deposit") return tx.amount;
  if (tx.kind === "savings_withdrawal") return -tx.amount;
  return 0;
}

export function isIncome(tx: Pick<LedgerTx, "kind" | "status">) {
  return tx.kind === "income" && tx.status !== "cancelled";
}
export function isExpense(tx: Pick<LedgerTx, "kind" | "status">) {
  return tx.kind === "expense" && tx.status !== "cancelled";
}

/* ---------- Filtros MongoDB equivalentes (usados nas agregações) ---------- */

export const CASHFLOW_KINDS = ["income", "expense"] as const;
export const NON_CASHFLOW_KINDS = ["transfer", "card_payment", "savings_deposit", "savings_withdrawal"] as const;

export function oid(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === "string" ? new Types.ObjectId(id) : id;
}

export function cashflowMatch(userId: string, from: Date, to: Date, mode: "realized" | "pending" | "all" = "realized") {
  const status = mode === "realized" ? "paid" : mode === "pending" ? "pending" : { $in: ["paid", "pending"] };
  return { userId: oid(userId), kind: { $in: [...CASHFLOW_KINDS] }, status, date: { $gte: from, $lte: to } };
}

/**
 * Expressão de agregação que transforma uma transação efetivada em uma lista de
 * {account, delta}. Espelha `effectOnAccount` (testado em conjunto).
 */
export const accountDeltasExpr = {
  $switch: {
    branches: [
      { case: { $eq: ["$kind", "income"] }, then: [{ account: "$accountId", delta: "$amount" }] },
      {
        case: { $and: [{ $eq: ["$kind", "expense"] }, { $eq: [{ $ifNull: ["$creditCardId", null] }, null] }] },
        then: [{ account: "$accountId", delta: { $multiply: ["$amount", -1] } }],
      },
      {
        case: { $eq: ["$kind", "transfer"] },
        then: [
          { account: "$accountId", delta: { $multiply: ["$amount", -1] } },
          { account: "$toAccountId", delta: "$amount" },
        ],
      },
      {
        case: { $in: ["$kind", ["card_payment", "savings_deposit"]] },
        then: [{ account: "$accountId", delta: { $multiply: ["$amount", -1] } }],
      },
      { case: { $eq: ["$kind", "savings_withdrawal"] }, then: [{ account: "$accountId", delta: "$amount" }] },
    ],
    default: [],
  },
};
