import "server-only";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { invalid } from "@/lib/errors";
import { today } from "@/lib/dates";
import { Goal, SavingsBox, Transaction } from "@/models";
import { savingsBalances } from "@/modules/ledger/service";
import { audit } from "@/modules/shared/audit";
import { assertOwned } from "@/modules/shared/ownership";
import { amountCents, dateOnlyString, objectId, optionalDate, optionalObjectId, signedCents, text } from "@/modules/shared/validation";
import { projectGoal, requiredMonthly } from "./rules";

export const goalSchema = z
  .object({
    name: text(80).min(1, "Informe o nome"),
    description: text(500).optional().default(""),
    target: amountCents,
    startDate: dateOnlyString,
    targetDate: optionalDate,
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    category: text(40).optional().default(""),
    status: z.enum(["active", "achieved", "paused", "cancelled"]).default("active"),
    savingsBoxId: optionalObjectId,
  })
  .refine((v) => !v.targetDate || v.targetDate >= v.startDate, { path: ["targetDate"], message: "Deve ser após a data de início" });
export type GoalInput = z.input<typeof goalSchema>;

export const contributionSchema = z.object({
  goalId: objectId,
  amount: signedCents.refine((v) => v !== 0, "Informe um valor"),
  date: dateOnlyString,
  note: text(140).optional().default(""),
});

export async function listGoals(userId: string, tz: string) {
  await connectDB();
  const [goals, balances, boxMoves] = await Promise.all([
    Goal.find({ userId }).sort({ status: 1, priority: 1, createdAt: -1 }).populate("savingsBoxId", "name color").lean(),
    savingsBalances(userId),
    Transaction.find({ userId, kind: { $in: ["savings_deposit", "savings_withdrawal"] }, status: "paid" }).select("kind amount date savingsBoxId").lean(),
  ]);
  const t = today(tz);
  return goals.map((g) => {
    const box = g.savingsBoxId as unknown as { _id: unknown; name: string; color: string } | null;
    const contributions = box
      ? boxMoves.filter((m) => String(m.savingsBoxId) === String(box._id)).map((m) => ({ amount: m.kind === "savings_deposit" ? m.amount : -m.amount, date: m.date }))
      : ((g.contributions ?? []) as { amount: number; date: Date }[]).map((c) => ({ amount: c.amount, date: c.date }));
    const current = box ? (balances.get(String(box._id)) ?? 0) : contributions.reduce((s, c) => s + c.amount, 0);
    const projection = projectGoal({ target: g.target, current, contributions, today: t });
    return {
      ...g,
      id: String(g._id),
      box,
      current,
      pct: Math.min(100, (current / g.target) * 100),
      projection,
      requiredMonthly: requiredMonthly(projection.remaining, t, g.targetDate ?? null),
    };
  });
}

async function checkBox(userId: string, boxId: string | null) {
  if (boxId) await assertOwned(SavingsBox, userId, boxId, "Caixinha");
}

export async function createGoal(userId: string, input: GoalInput) {
  const data = goalSchema.parse(input);
  await connectDB();
  await checkBox(userId, data.savingsBoxId);
  const doc = await Goal.create({ ...data, userId });
  await audit(userId, "goal", doc._id, "create", null, doc.toObject());
  return { id: String(doc._id) };
}

export async function updateGoal(userId: string, id: string, input: GoalInput) {
  const data = goalSchema.parse(input);
  await connectDB();
  const before = await assertOwned(Goal, userId, id, "Objetivo");
  await checkBox(userId, data.savingsBoxId);
  await Goal.updateOne({ _id: id, userId }, { $set: data });
  await audit(userId, "goal", id, "update", before, data);
}

export async function deleteGoal(userId: string, id: string) {
  await connectDB();
  const g = await assertOwned(Goal, userId, id, "Objetivo");
  await Goal.deleteOne({ _id: id, userId });
  await audit(userId, "goal", id, "delete", g, null);
}

/** Aporte/retirada manual (apenas para objetivos sem caixinha vinculada). */
export async function addContribution(userId: string, input: z.input<typeof contributionSchema>) {
  const data = contributionSchema.parse(input);
  await connectDB();
  const g = await assertOwned(Goal, userId, data.goalId, "Objetivo");
  if (g.savingsBoxId) throw invalid("Este objetivo usa uma caixinha: movimente pela caixinha.");
  const current = ((g.contributions ?? []) as { amount: number }[]).reduce((s, c) => s + c.amount, 0);
  if (current + data.amount < 0) throw invalid("A retirada excede o valor acumulado.", { amount: "Excede o acumulado" });
  await Goal.updateOne({ _id: data.goalId, userId }, { $push: { contributions: { amount: data.amount, date: data.date, note: data.note } } });
  await audit(userId, "goal", data.goalId, "update", { current }, { current: current + data.amount });
}

export async function removeContribution(userId: string, goalId: string, contributionId: string) {
  await connectDB();
  await assertOwned(Goal, userId, goalId, "Objetivo");
  await Goal.updateOne({ _id: goalId, userId }, { $pull: { contributions: { _id: contributionId } } });
}
