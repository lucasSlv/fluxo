import { requireUser } from "@/modules/auth/dal";
import { listBudgets } from "@/modules/budgets/service";
import { listCategories } from "@/modules/categories/service";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { MonthNav } from "@/components/finance/month-nav";
import { monthKey, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { serialize } from "@/lib/utils";
import { BudgetsView } from "./_components/budgets-view";

export const metadata = { title: "Limites" };

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : monthKey(today(user.preferences.timezone));
  const thresholds = user.preferences.alertThresholds;
  const [budgets, categories] = await Promise.all([listBudgets(user.id, month, thresholds), listCategories(user.id)]);
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const withoutLimit = categories.filter((c) => c.kind === "expense" && !budgets.some((b) => b.categoryId === c.id));
  const cur = user.preferences.currency;

  return (
    <>
      <PageHeader title="Limites mensais" description="Defina quanto pode gastar por categoria. Cada mês tem seus próprios limites." actions={<MonthNav month={month} basePath="/budgets" />} />
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total planejado" value={formatMoney(totalLimit, cur)} />
        <Stat label="Gasto nas categorias" value={formatMoney(totalSpent, cur)} />
        <Stat label="Disponível" value={formatMoney(totalLimit - totalSpent, cur)} tone={totalLimit - totalSpent < 0 ? "neg" : "pos"} />
        <Stat label="Categorias em alerta" value={budgets.filter((b) => b.threshold != null).length} hint={`Limiares: ${thresholds.join("%, ")}%`} />
      </section>
      <BudgetsView month={month} thresholds={thresholds} budgets={serialize(budgets)} withoutLimit={serialize(withoutLimit)} />
    </>
  );
}
