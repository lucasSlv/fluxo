import "server-only";
import { connectDB } from "@/lib/db";
import { AppError, invalid } from "@/lib/errors";
import { Budget, Category, Recurrence, Transaction } from "@/models";
import { audit } from "@/modules/shared/audit";
import { assertOwned } from "@/modules/shared/ownership";
import { categorySchema, type CategoryInput } from "./schemas";

export type CategoryNode = {
  id: string;
  name: string;
  kind: "income" | "expense";
  icon: string;
  color: string;
  parentId: string | null;
  system: string | null;
  children: CategoryNode[];
};

export async function listCategories(userId: string): Promise<CategoryNode[]> {
  await connectDB();
  const docs = await Category.find({ userId, archived: false }).sort({ name: 1 }).lean();
  const nodes = docs.map<CategoryNode>((c) => ({
    id: String(c._id),
    name: c.name,
    kind: c.kind as CategoryNode["kind"],
    icon: c.icon ?? "tag",
    color: c.color ?? "#6b7280",
    parentId: c.parentId ? String(c.parentId) : null,
    system: c.system ?? null,
    children: [],
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots: CategoryNode[] = [];
  for (const n of nodes) {
    const parent = n.parentId ? byId.get(n.parentId) : null;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  return roots;
}

async function validateParent(userId: string, parentId: string | null, kind: string, selfId?: string) {
  if (!parentId) return;
  if (parentId === selfId) throw invalid("Uma categoria não pode ser subcategoria de si mesma.", { parentId: "Inválido" });
  const parent = await assertOwned(Category, userId, parentId, "Categoria-mãe");
  if (parent.parentId) throw invalid("Subcategorias só podem ter um nível.", { parentId: "Escolha uma categoria principal" });
  if (parent.kind !== kind) throw invalid("A subcategoria deve ser do mesmo tipo da categoria-mãe.", { parentId: "Tipo diferente" });
}

export async function createCategory(userId: string, input: CategoryInput) {
  const data = categorySchema.parse(input);
  await connectDB();
  await validateParent(userId, data.parentId, data.kind);
  const doc = await Category.create({ ...data, userId });
  return { id: String(doc._id) };
}

export async function updateCategory(userId: string, id: string, input: CategoryInput) {
  const data = categorySchema.parse(input);
  await connectDB();
  const current = await assertOwned(Category, userId, id, "Categoria");
  if (current.kind !== data.kind) {
    const used = await Transaction.exists({ userId, categoryId: id });
    if (used) throw invalid("Não é possível mudar o tipo de uma categoria com movimentações.", { kind: "Categoria em uso" });
  }
  if (data.parentId && (await Category.exists({ userId, parentId: id }))) {
    throw invalid("Esta categoria possui subcategorias e não pode virar subcategoria.", { parentId: "Possui subcategorias" });
  }
  await validateParent(userId, data.parentId, data.kind, id);
  await Category.updateOne({ _id: id, userId }, { $set: data });
}

/**
 * Remove a categoria. Se houver movimentações/recorrências, apenas arquiva para manter o histórico
 * dos relatórios. Subcategorias seguem o mesmo destino.
 */
export async function deleteCategory(userId: string, id: string): Promise<"deleted" | "archived"> {
  await connectDB();
  const cat = await assertOwned(Category, userId, id, "Categoria");
  if (cat.system) throw new AppError("VALIDATION", "Categorias do sistema não podem ser excluídas.");
  const ids = [id, ...(await Category.find({ userId, parentId: id }).distinct("_id")).map(String)];
  const used = (await Transaction.exists({ userId, categoryId: { $in: ids } })) || (await Recurrence.exists({ userId, categoryId: { $in: ids } }));
  if (used) {
    await Category.updateMany({ userId, _id: { $in: ids } }, { $set: { archived: true } });
    await audit(userId, "category", id, "update", cat, { archived: true });
    return "archived";
  }
  await Category.deleteMany({ userId, _id: { $in: ids } });
  await Budget.deleteMany({ userId, categoryId: { $in: ids } });
  await audit(userId, "category", id, "delete", cat, null);
  return "deleted";
}

/** Categoria técnica (ex.: "Dívidas"). Cria se ainda não existir. */
export async function systemCategory(userId: string, system: "debt"): Promise<string> {
  await connectDB();
  const found = await Category.findOne({ userId, system }).lean();
  if (found) return String(found._id);
  const doc = await Category.create({ userId, name: "Dívidas", kind: "expense", icon: "landmark", color: "#64748b", system });
  return String(doc._id);
}
