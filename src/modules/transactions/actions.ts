"use server";

import { authedAction } from "@/modules/auth/dal";
import { createTransaction, deleteTransaction, setTransactionStatus, updateTransaction } from "./service";
import { deleteAttachment } from "./attachments";
import type { TransactionInput } from "./schemas";

export async function createTransactionAction(input: TransactionInput) {
  return authedAction("transaction.create", (u) => createTransaction(u.id, input));
}
export async function updateTransactionAction(id: string, input: TransactionInput) {
  return authedAction("transaction.update", (u) => updateTransaction(u.id, id, input, u.preferences.timezone));
}
export async function deleteTransactionAction(id: string) {
  return authedAction("transaction.delete", (u) => deleteTransaction(u.id, id));
}
export async function setTransactionStatusAction(id: string, status: "paid" | "pending", opts?: { paidAt?: string; accountId?: string }) {
  return authedAction("transaction.status", (u) => setTransactionStatus(u.id, id, status, opts));
}
export async function deleteAttachmentAction(transactionId: string, fileId: string) {
  return authedAction("transaction.attachment.delete", (u) => deleteAttachment(u.id, transactionId, fileId));
}
