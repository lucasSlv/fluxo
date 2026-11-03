"use server";

import { authedAction } from "@/modules/auth/dal";
import { createBox, deleteBox, deleteBoxMove, moveBox, updateBox, type BoxInput, type BoxMoveInput } from "./service";

export async function createBoxAction(input: BoxInput) {
  return authedAction("box.create", (u) => createBox(u.id, input));
}
export async function updateBoxAction(id: string, input: BoxInput) {
  return authedAction("box.update", (u) => updateBox(u.id, id, input));
}
export async function deleteBoxAction(id: string) {
  return authedAction("box.delete", (u) => deleteBox(u.id, id));
}
export async function moveBoxAction(input: BoxMoveInput) {
  return authedAction("box.move", (u) => moveBox(u.id, input));
}
export async function deleteBoxMoveAction(txId: string) {
  return authedAction("box.move.delete", (u) => deleteBoxMove(u.id, txId));
}
