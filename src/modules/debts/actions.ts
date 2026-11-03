"use server";

import { authedAction } from "@/modules/auth/dal";
import { setTransactionStatus } from "@/modules/transactions/service";
import { createDebt, deleteDebt, extraPayment, syncDebtStatus, updateDebt } from "./service";
import type { DebtInput, DebtUpdateInput } from "./schemas";

export async function createDebtAction(input: DebtInput) {
  return authedAction("debt.create", (u) => createDebt(u.id, input));
}
export async function updateDebtAction(id: string, input: DebtUpdateInput) {
  return authedAction("debt.update", (u) => updateDebt(u.id, id, input));
}
export async function deleteDebtAction(id: string) {
  return authedAction("debt.delete", (u) => deleteDebt(u.id, id));
}
export async function extraPaymentAction(id: string, input: { amount: number; date: string; accountId: string }) {
  return authedAction("debt.extra", (u) => extraPayment(u.id, id, input));
}
/** Paga/estorna uma parcela e recalcula o status da dívida. */
export async function setInstallmentStatusAction(debtId: string, txId: string, status: "paid" | "pending", paidAt?: string) {
  return authedAction("debt.installment", async (u) => {
    await setTransactionStatus(u.id, txId, status, { paidAt });
    await syncDebtStatus(u.id, debtId);
  });
}
