"use server";

import { authedAction } from "@/modules/auth/dal";
import { addContribution, createGoal, deleteGoal, removeContribution, updateGoal, type GoalInput } from "./service";

export async function createGoalAction(input: GoalInput) {
  return authedAction("goal.create", (u) => createGoal(u.id, input));
}
export async function updateGoalAction(id: string, input: GoalInput) {
  return authedAction("goal.update", (u) => updateGoal(u.id, id, input));
}
export async function deleteGoalAction(id: string) {
  return authedAction("goal.delete", (u) => deleteGoal(u.id, id));
}
export async function addContributionAction(input: { goalId: string; amount: number; date: string; note?: string }) {
  return authedAction("goal.contribution", (u) => addContribution(u.id, input));
}
export async function removeContributionAction(goalId: string, contributionId: string) {
  return authedAction("goal.contribution.delete", (u) => removeContribution(u.id, goalId, contributionId));
}
