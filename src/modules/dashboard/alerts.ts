import "server-only";
import { connectDB } from "@/lib/db";
import { addDays, monthKey, today } from "@/lib/dates";
import { Transaction } from "@/models";
import { listBudgets } from "@/modules/budgets/service";
import type { CurrentUser } from "@/modules/auth/dal";

/** Quantidade de alertas: contas atrasadas, vencendo em breve e limites no último limiar configurado. */
export async function alertCount(userId: string, prefs: CurrentUser["preferences"]): Promise<number> {
  await connectDB();
  const t = today(prefs.timezone);
  const [overdue, dueSoon, budgets] = await Promise.all([
    Transaction.countDocuments({ userId, status: "pending", dueDate: { $lt: t } }),
    Transaction.countDocuments({ userId, status: "pending", dueDate: { $gte: t, $lte: addDays(t, prefs.dueSoonDays) } }),
    listBudgets(userId, monthKey(t), prefs.alertThresholds),
  ]);
  const top = Math.max(...prefs.alertThresholds);
  const high = prefs.alertThresholds.filter((x) => x >= 90);
  return overdue + dueSoon + budgets.filter((b) => b.threshold != null && (b.threshold >= top || high.includes(b.threshold))).length;
}
