import "server-only";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { invalid } from "@/lib/errors";
import { monthRange, shiftMonth, type MonthKey } from "@/lib/dates";
import { Budget, Category } from "@/models";
import { totalsByCategory } from "@/modules/ledger/service";
import { audit } from "@/modules/shared/audit";
import { assertOwned } from "@/modules/shared/ownership";
import { centsAllowZero, monthKeySchema, objectId } from "@/modules/shared/validation";
import { budgetLevel, reachedThreshold, type BudgetLevel } from "./rules";

export const budgetSchema = z.object({ categoryId: objectId, month: monthKeySchema, limit: centsAllowZero });

export type BudgetRow = {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  limit: number;
  spent: number;
  available: number;
  pct: number;
  level: BudgetLevel;
  threshold: number | null;
};

/** Limites do mês com gasto efetivado (inclui subcategorias e compras no cartão). */
export async function listBudgets(userId: string, month: MonthKey, thresholds: number[]): Promise<BudgetRow[]> {
  await connectDB();
  const { from, to } = monthRange(month);
  const [budgets, spent] = await Promise.all([
    Budget.find({ userId, month }).populate("categoryId", "name icon color").lean() as unknown as Promise<
      { _id: unknown; limit: number; categoryId: { _id: unknown; name: string; icon: string; color: string } | null }[]
    >,
    totalsByCategory(userId, from, to, "expense"),
  ]);
  return budgets
    .filter((b) => b.categoryId)
    .map((b) => {
      const cat = b.categoryId!;
      const s = spent.find((x) => x.categoryId === String(cat._id))?.total ?? 0;
      return {
        id: String(b._id),
        categoryId: String(cat._id),
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        limit: b.limit,
        spent: s,
        available: b.limit - s,
        pct: b.limit > 0 ? (s / b.limit) * 100 : s > 0 ? 100 : 0,
        level: budgetLevel(s, b.limit),
        threshold: reachedThreshold(s, b.limit, thresholds),
      };
    })
    .sort((a, b) => b.pct - a.pct);
}

/** Define (ou atualiza) o limite de uma categoria em um mês específico. Meses são independentes. */
export async function setBudget(userId: string, input: z.input<typeof budgetSchema>) {
  const data = budgetSchema.parse(input);
  await connectDB();
  const cat = await assertOwned(Category, userId, data.categoryId, "Categoria");
  if (cat.kind !== "expense") throw invalid("Limites só se aplicam a categorias de despesa.", { categoryId: "Escolha uma despesa" });
  if (cat.parentId) throw invalid("Defina o limite na categoria principal.", { categoryId: "Use a categoria principal" });
  const before = await Budget.findOne({ userId, categoryId: data.categoryId, month: data.month }).lean();
  await Budget.updateOne({ userId, categoryId: data.categoryId, month: data.month }, { $set: { limit: data.limit } }, { upsert: true });
  await audit(userId, "budget", before?._id ?? cat._id, before ? "update" : "create", before, data);
}

export async function deleteBudget(userId: string, id: string) {
  await connectDB();
  const b = await assertOwned(Budget, userId, id, "Limite");
  await Budget.deleteOne({ _id: id, userId });
  await audit(userId, "budget", id, "delete", b, null);
}

/** Copia os limites do mês anterior para meses que ainda não têm limite (não sobrescreve). */
export async function copyBudgetsFromPrevious(userId: string, month: MonthKey): Promise<number> {
  monthKeySchema.parse(month);
  await connectDB();
  const prev = await Budget.find({ userId, month: shiftMonth(month, -1) }).lean();
  let created = 0;
  for (const b of prev) {
    const r = await Budget.updateOne({ userId, categoryId: b.categoryId, month }, { $setOnInsert: { limit: b.limit } }, { upsert: true });
    created += r.upsertedCount;
  }
  return created;
}
