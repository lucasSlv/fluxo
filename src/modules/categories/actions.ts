"use server";

import { authedAction } from "@/modules/auth/dal";
import { createCategory, deleteCategory, updateCategory } from "./service";
import type { CategoryInput } from "./schemas";

export async function createCategoryAction(input: CategoryInput) {
  return authedAction("category.create", (u) => createCategory(u.id, input));
}
export async function updateCategoryAction(id: string, input: CategoryInput) {
  return authedAction("category.update", (u) => updateCategory(u.id, id, input));
}
export async function deleteCategoryAction(id: string) {
  return authedAction("category.delete", (u) => deleteCategory(u.id, id));
}
