"use server";

import { authedAction } from "@/modules/auth/dal";
import { createCard, createPurchase, deleteCard, deleteInvoicePayment, payInvoice, updateCard } from "./service";
import type { CardInput, InvoicePaymentInput, PurchaseInput } from "./schemas";

export async function createCardAction(input: CardInput) {
  return authedAction("card.create", (u) => createCard(u.id, input));
}
export async function updateCardAction(id: string, input: CardInput) {
  return authedAction("card.update", (u) => updateCard(u.id, id, input));
}
export async function deleteCardAction(id: string) {
  return authedAction("card.delete", (u) => deleteCard(u.id, id));
}
export async function createPurchaseAction(input: PurchaseInput) {
  return authedAction("card.purchase", (u) => createPurchase(u.id, input));
}
export async function payInvoiceAction(input: InvoicePaymentInput) {
  return authedAction("card.pay", (u) => payInvoice(u.id, input, u.preferences.timezone));
}
export async function deleteInvoicePaymentAction(txId: string) {
  return authedAction("card.pay.delete", (u) => deleteInvoicePayment(u.id, txId));
}
