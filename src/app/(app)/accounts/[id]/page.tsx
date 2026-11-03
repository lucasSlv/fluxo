import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { accountStatement } from "@/modules/accounts/service";
import { KIND_LABEL } from "@/modules/transactions/schemas";
import { resolvePeriod, type PeriodParams } from "@/lib/period";
import { formatDate, monthKey, toISODate, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Stat } from "@/components/ui/stat";
import { PeriodFilter } from "@/components/finance/period-filter";

export const metadata = { title: "Extrato" };

export default async function StatementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<PeriodParams> }) {
  const user = await requireUser();
  const { id } = await params;
  const tz = user.preferences.timezone;
  const period = resolvePeriod(await searchParams, tz);
  const st = await accountStatement(user.id, id, period.from, period.to);
  const cur = user.preferences.currency;
  const fmt = user.preferences.dateFormat;
  const inflow = st.lines.filter((l) => l.delta > 0).reduce((s, l) => s + l.delta, 0);
  const outflow = st.lines.filter((l) => l.delta < 0).reduce((s, l) => s - l.delta, 0);

  return (
    <div>
      <Link href="/accounts" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-3 hover:text-ink">
        <ArrowLeft size={15} /> Contas
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Extrato · {st.account.name}</h1>
          <p className="mt-1 text-sm text-ink-3">Somente movimentações efetivadas afetam o saldo.</p>
        </div>
        <PeriodFilter mode={period.mode} month={period.month ?? monthKey(today(tz))} year={String(period.from.getUTCFullYear())} from={toISODate(period.from)} to={toISODate(period.to)} />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Saldo inicial do período" value={formatMoney(st.opening, cur)} />
        <Stat label="Entradas" value={formatMoney(inflow, cur)} tone="pos" />
        <Stat label="Saídas" value={formatMoney(outflow, cur)} tone="neg" />
        <Stat label="Saldo final do período" value={formatMoney(st.closing, cur)} tone={st.closing < 0 ? "neg" : undefined} />
      </div>
      <div className="overflow-x-auto rounded-2xl bg-muted">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-3">
              <th className="px-4 py-3 font-semibold">Data</th>
              <th className="px-4 py-3 font-semibold">Descrição</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 text-right font-semibold">Valor</th>
              <th className="px-4 py-3 text-right font-semibold">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {st.lines.map((l) => (
              <tr key={String(l._id)} className="bg-surface/60">
                <td className="px-4 py-3 text-ink-3">{formatDate(l.date, fmt)}</td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/transactions/${l._id}`} className="hover:underline">
                    {l.description}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-ink-3">{(l.categoryId as unknown as { name: string } | null)?.name ?? KIND_LABEL[l.kind]}</td>
                <td className={cn("px-4 py-3 text-right font-bold tabular", l.delta > 0 ? "text-pos" : "text-ink")}>{formatMoney(l.delta, cur, { sign: true })}</td>
                <td className={cn("px-4 py-3 text-right tabular", l.balance < 0 && "text-neg")}>{formatMoney(l.balance, cur)}</td>
              </tr>
            ))}
            {!st.lines.length && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-3">
                  Nenhuma movimentação efetivada no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
