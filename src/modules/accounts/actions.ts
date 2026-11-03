"use server";

import { authedAction } from "@/modules/auth/dal";
import { createAccount, deleteAccount, updateAccount } from "./service";
import type { AccountInput } from "./schemas";

export async function createAccountAction(input: AccountInput) {
  return authedAction("account.create", (u) => createAccount(u.id, input));
}
export async function updateAccountAction(id: string, input: AccountInput) {
  return authedAction("account.update", (u) => updateAccount(u.id, id, input));
}
export async function deleteAccountAction(id: string) {
  return authedAction("account.delete", (u) => deleteAccount(u.id, id));
}
