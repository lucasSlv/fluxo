import { requireUser } from "@/modules/auth/dal";
import { ensureRecurrencesGenerated, listRecurrences } from "@/modules/recurring/service";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { formatMoney } from "@/lib/money";
import { serialize } from "@/lib/utils";
import { RecurringView, type RecurrenceItem } from "./_components/recurring-view";

export const metadata = { title: "Recorrentes" };

export default async function RecurringPage() {
  const user = await requireUser();
  await ensureRecurrencesGenerated(user.id, user.preferences.timezone);
  const recs = await listRecurrences(user.id);
  const active = recs.filter((r) => r.status === "active");
  const monthlyExpense = active.filter((r) => r.kind === "expense").reduce((s, r) => s + r.monthly, 0);
  const monthlyIncome = active.filter((r) => r.kind === "income").reduce((s, r) => s + r.monthly, 0);
  const cur = user.preferences.currency;
  return (
    <>
      <PageHeader title="Despesas recorrentes" description="Contas fixas e receitas que se repetem. Cada ocorrência é gerada individualmente em Movimentações." />
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Recorrências ativas" value={active.length} />
        <Stat label="Despesas fixas / mês" value={formatMoney(monthlyExpense, cur)} tone="neg" hint="Equivalente mensal" />
        <Stat label="Receitas fixas / mês" value={formatMoney(monthlyIncome, cur)} tone="pos" hint="Equivalente mensal" />
      </section>
      <RecurringView items={serialize(recs) as unknown as RecurrenceItem[]} dateFormat={user.preferences.dateFormat} />
    </>
  );
}
