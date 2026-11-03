"use server";

import { authedAction } from "@/modules/auth/dal";
import { createRecurrence, setRecurrenceStatus, updateRecurrence } from "./service";
import type { RecurrenceInput } from "./schemas";

export async function createRecurrenceAction(input: RecurrenceInput) {
  return authedAction("recurrence.create", (u) => createRecurrence(u.id, input, u.preferences.timezone));
}
export async function updateRecurrenceAction(id: string, input: RecurrenceInput) {
  return authedAction("recurrence.update", (u) => updateRecurrence(u.id, id, input, u.preferences.timezone));
}
export async function setRecurrenceStatusAction(id: string, status: "active" | "paused" | "cancelled") {
  return authedAction("recurrence.status", (u) => setRecurrenceStatus(u.id, id, status, u.preferences.timezone));
}
