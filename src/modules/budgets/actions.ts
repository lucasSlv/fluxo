"use server";

import { authedAction } from "@/modules/auth/dal";
import { copyBudgetsFromPrevious, deleteBudget, setBudget } from "./service";

export async function setBudgetAction(input: { categoryId: string; month: string; limit: number }) {
  return authedAction("budget.set", (u) => setBudget(u.id, input));
}
export async function deleteBudgetAction(id: string) {
  return authedAction("budget.delete", (u) => deleteBudget(u.id, id));
}
export async function copyBudgetsAction(month: string) {
  return authedAction("budget.copy", (u) => copyBudgetsFromPrevious(u.id, month));
}
