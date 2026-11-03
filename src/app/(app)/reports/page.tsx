import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Lightbulb, PiggyBank } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { getReport } from "@/modules/reports/service";
import { resolvePeriod, type PeriodParams } from "@/lib/period";
import { formatDate, monthKey, monthLabel, toISODate, today, monthTitle } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn, serialize } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Delta, Stat } from "@/components/ui/stat";
import { CategoryIcon } from "@/components/ui/icon";
import { BalanceLine, CategoryDonut, CategoryMonthlyBars, ResultBars } from "@/components/dashboard/charts";
import { ForecastBars, SavingsRateLine } from "@/components/reports/charts";
import { PeriodFilter } from "@/components/finance/period-filter";
import { ExportButtons } from "./_components/export-buttons";

export const metadata = { title: "Relatórios" };

const pctFmt = (v: number | null | undefined, digits = 1) => (v == null ? "—" : `${v.toFixed(digits).replace(".", ",")}%`);

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
        {description && <p className="text-xs text-ink-3">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<PeriodParams> }) {
  const user = await requireUser();
  const tz = user.preferences.timezone;
  const sp = await searchParams;
  const period = resolvePeriod(sp, tz);
  const r = await getReport(user.id, tz, period, user.preferences.alertThresholds);
  const cur = user.preferences.currency;
  const fmt = user.preferences.dateFormat;
  const m = (v: number) => formatMoney(v, cur);

  const from = toISODate(period.from);
  const to = toISODate(period.to);
  const reportQuery = new URLSearchParams(period.mode === "month" ? { month: period.month! } : period.mode === "year" ? { year: String(period.from.getUTCFullYear()) } : { from, to }).toString();
  const txQuery = new URLSearchParams({ from, to }).toString();

  const expenseTotal = r.totals.expense;
  const bottomCats = r.byCategory.length > 3 ? [...r.byCategory].reverse().slice(0, 3) : [];
  const fvTotal = r.fixedVsVariable.fixed + r.fixedVsVariable.variable;
  const series = serialize(r.series);
  const catSeries = r.topCats.map((c) => ({ key: c.categoryId ?? "none", name: c.name, color: c.color }));

  return (
    <div className="space-y-10">
      <PageHeader
        title="Relatórios"
        description={`Período: ${period.label}. Valores efetivados, com as mesmas regras do dashboard.`}
        actions={<ExportButtons txQuery={txQuery} reportQuery={reportQuery} />}
      />
      <div className="no-print -mt-4">
        <PeriodFilter mode={period.mode} month={period.month ?? monthKey(today(tz))} year={String(period.from.getUTCFullYear())} from={from} to={to} />
      </div>

      {/* Resultado financeiro */}
      <Section title="Resultado financeiro" description="Receitas e despesas efetivadas. Transferências, caixinhas e pagamentos de fatura não entram na conta.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat className="print-block" label="Receitas" value={m(r.totals.income)} hint={<Delta current={r.totals.income} previous={r.prevTotals.income} />} icon={<ArrowUpRight size={15} />} tone="pos" />
          <Stat className="print-block" label="Despesas" value={m(r.totals.expense)} hint={<Delta current={r.totals.expense} previous={r.prevTotals.expense} invert />} icon={<ArrowDownRight size={15} />} tone="neg" />
          <Stat className="print-block" label="Saldo do período" value={formatMoney(r.totals.result, cur, { sign: true })} tone={r.totals.result >= 0 ? "pos" : "neg"} hint={r.totals.result >= 0 ? "Positivo" : "Negativo"} />
          <Stat
            className="print-block"
            label="Taxa de economia"
            value={pctFmt(r.savingsRate)}
            icon={<PiggyBank size={15} />}
            tone={r.savingsRate == null ? undefined : r.savingsRate >= 0 ? "pos" : "neg"}
            hint={r.savingsRate == null ? "Sem receitas no período" : "do que entrou ficou com você"}
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="print-block">
            <CardTitle action={<span className="text-xs text-ink-3">Patrimônio atual: <b className={cn(r.worth.netWorth < 0 ? "text-neg" : "text-ink")}>{m(r.worth.netWorth)}</b></span>}>Evolução do saldo em contas</CardTitle>
            {r.hasEnoughHistory ? <BalanceLine data={series} /> : <p className="py-12 text-center text-sm text-ink-3">A evolução aparece a partir de dois meses com movimentações.</p>}
          </Card>
          <Card className="print-block">
            <CardTitle>Resultado mensal</CardTitle>
            <ResultBars data={series} />
          </Card>
        </div>
        <Card className="print-block">
          <CardTitle>Taxa de economia mensal</CardTitle>
          <SavingsRateLine data={series} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div className="rounded-xl bg-surface p-3"><p className="text-ink-3">Contas</p><p className="font-bold tabular">{m(r.worth.accounts)}</p></div>
            <div className="rounded-xl bg-surface p-3"><p className="text-ink-3">Caixinhas</p><p className="font-bold tabular">{m(r.worth.savings)}</p></div>
            <div className="rounded-xl bg-surface p-3"><p className="text-ink-3">Faturas em aberto</p><p className="font-bold tabular text-neg">{m(r.worth.cardDebt)}</p></div>
            <div className="rounded-xl bg-surface p-3"><p className="text-ink-3">Dívidas</p><p className="font-bold tabular text-neg">{m(r.worth.debts)}</p></div>
          </div>
        </Card>
      </Section>

      {/* Análise de despesas */}
      <Section title="Análise de despesas" description="Subcategorias somadas à categoria principal. Compras no cartão contam na data de cada parcela.">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="print-block">
            <CardTitle>Distribuição por categoria</CardTitle>
            {r.byCategory.length ? <CategoryDonut data={r.byCategory} /> : <p className="py-10 text-center text-sm text-ink-3">Sem despesas no período.</p>}
          </Card>
          <Card className="print-block">
            <CardTitle>Maiores e menores gastos</CardTitle>
            {r.byCategory.length ? (
              <div className="space-y-5">
                <ul className="space-y-3">
                  {r.byCategory.slice(0, 5).map((c) => (
                    <li key={c.name}>
                      <div className="mb-1 flex items-center gap-2 text-xs">
                        <CategoryIcon name={c.icon} size={14} className="text-ink-3" />
                        <span className="flex-1 font-semibold">{c.name}</span>
                        <span className="font-bold tabular">{m(c.total)}</span>
                        <span className="w-12 text-right tabular text-ink-3">{pctFmt(expenseTotal ? (c.total / expenseTotal) * 100 : null, 0)}</span>
                      </div>
                      <Progress value={(c.total / r.byCategory[0].total) * 100} tone="bg-ink" size="sm" />
                    </li>
                  ))}
                </ul>
                {bottomCats.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Menores gastos</p>
                    <ul className="space-y-1.5 text-xs">
                      {bottomCats.map((c) => (
                        <li key={c.name} className="flex justify-between">
                          <span className="text-ink-2">{c.name}</span>
                          <span className="font-semibold tabular">{m(c.total)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-ink-3">Sem despesas no período.</p>
            )}
          </Card>
        </div>
        <Card className="print-block">
          <CardTitle>Comparativo mensal por categoria</CardTitle>
          {catSeries.length ? <CategoryMonthlyBars data={serialize(r.categoryComparison)} series={catSeries} /> : <p className="py-10 text-center text-sm text-ink-3">Sem dados suficientes.</p>}
        </Card>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="print-block">
            <CardTitle>Fixos × variáveis</CardTitle>
            {fvTotal ? (
              <div className="space-y-3">
                <div className="flex h-3 overflow-hidden rounded-full bg-black/5">
                  <div className="bg-ink" style={{ width: `${(r.fixedVsVariable.fixed / fvTotal) * 100}%` }} />
                  <div className="bg-ink-4" style={{ width: `${(r.fixedVsVariable.variable / fvTotal) * 100}%` }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink" /> Fixas <b className="tabular">{m(r.fixedVsVariable.fixed)}</b></span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-4" /> Variáveis <b className="tabular">{m(r.fixedVsVariable.variable)}</b></span>
                </div>
                <p className="text-xs text-ink-3">{pctFmt((r.fixedVsVariable.fixed / fvTotal) * 100, 0)} das despesas são fixas.</p>
              </div>
            ) : (
              <p className="text-sm text-ink-3">Sem despesas no período.</p>
            )}
          </Card>
          <Card className="print-block">
            <CardTitle>Gastos recorrentes</CardTitle>
            <p className="text-2xl font-extrabold tabular">{m(r.recurringTotal)}</p>
            <p className="mt-1 text-xs text-ink-3">
              pagos em recorrências no período{expenseTotal ? ` (${pctFmt((r.recurringTotal / expenseTotal) * 100, 0)} das despesas)` : ""}.
            </p>
            <Link href="/recurring" className="no-print mt-3 inline-block text-xs font-semibold underline-offset-4 hover:underline">Gerenciar recorrências</Link>
          </Card>
          <Card className="print-block">
            <CardTitle>Receitas por categoria</CardTitle>
            {r.byCategoryIncome.length ? (
              <ul className="space-y-1.5 text-xs">
                {r.byCategoryIncome.slice(0, 5).map((c) => (
                  <li key={c.name} className="flex justify-between">
                    <span className="text-ink-2">{c.name}</span>
                    <span className="font-semibold tabular text-pos">{m(c.total)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Sem receitas no período.</p>
            )}
          </Card>
        </div>
        <Card className="print-block">
          <CardTitle action={<span className="text-xs text-ink-3">a partir de {m(r.extraordinaryThreshold)}</span>}>Gastos extraordinários</CardTitle>
          <p className="mb-3 text-xs text-ink-3">Despesas avulsas (não recorrentes, não parceladas e fora de dívidas) com valor de pelo menos 3× a mediana das despesas do período e no mínimo R$ 100,00.</p>
          {r.extraordinary.length ? (
            <ul className="divide-y divide-line text-sm">
              {r.extraordinary.map((e) => {
                const c = e.categoryId as unknown as { name: string; icon: string; color: string } | null;
                return (
                  <li key={String(e._id)} className="flex items-center gap-3 py-2.5">
                    <CategoryIcon name={c?.icon} size={15} className="text-ink-3" />
                    <span className="min-w-0 flex-1 truncate font-medium">{e.description}</span>
                    <span className="hidden text-xs text-ink-3 sm:inline">{c?.name ?? "Sem categoria"}</span>
                    <span className="text-xs text-ink-3">{formatDate(e.date, fmt)}</span>
                    <Money value={e.amount} className="w-28 text-right font-bold" />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Nenhum gasto fora do padrão no período.</p>
          )}
        </Card>
      </Section>

      {/* Planejamento */}
      <Section title="Planejamento" description="Compromissos já conhecidos: contas a pagar, recorrências, parcelas de cartão e de dívidas.">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="print-block">
            <CardTitle>Previsão dos próximos 3 meses</CardTitle>
            <ForecastBars data={r.forecast} />
            <ul className="mt-3 grid grid-cols-3 gap-2 text-xs">
              {r.forecast.map((f) => (
                <li key={f.month} className="rounded-xl bg-surface p-2.5">
                  <p className="font-semibold">{monthTitle(f.month)}</p>
                  <p className={cn("tabular font-bold", f.income - f.expense >= 0 ? "text-pos" : "text-neg")}>{formatMoney(f.income - f.expense, cur, { sign: true })}</p>
                </li>
              ))}
            </ul>
          </Card>
          <div className="space-y-3">
            <Stat
              className="print-block"
              label="Comprometimento com recorrências"
              value={pctFmt(r.commitmentPct, 0)}
              tone={r.commitmentPct != null && r.commitmentPct > 50 ? "neg" : r.commitmentPct != null && r.commitmentPct > 35 ? "warn" : undefined}
              hint={`${m(r.recurringCommitment)}/mês em despesas recorrentes ativas sobre a renda média do período`}
            />
            <Stat className="print-block" label="Dívidas em aberto" value={m(r.debtTotal)} tone={r.debtTotal > 0 ? "neg" : undefined} hint={r.debtMonthly ? `${m(r.debtMonthly)}/mês em parcelas` : "Nenhuma dívida ativa"} />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="print-block">
            <CardTitle action={<Link href="/debts" className="no-print text-xs font-semibold text-ink-3 hover:text-ink">Dívidas</Link>}>Projeção de quitação</CardTitle>
            {r.debts.length ? (
              <ul className="space-y-3">
                {r.debts.map((d) => (
                  <li key={d.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-semibold">{d.name}</span>
                      <span className="shrink-0 text-ink-3">
                        {d.payoffDate ? `quitação em ${formatDate(d.payoffDate, fmt)}` : "—"} · <b className="text-ink tabular">{m(d.outstanding)}</b>
                      </span>
                    </div>
                    <Progress value={d.progress} tone="bg-pos" size="sm" />
                    {d.overdueCount > 0 && <Badge tone="neg" className="mt-1">{d.overdueCount} parcela(s) atrasada(s)</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Nenhuma dívida ativa. 🎉</p>
            )}
          </Card>
          <Card className="print-block">
            <CardTitle action={<Link href="/goals" className="no-print text-xs font-semibold text-ink-3 hover:text-ink">Objetivos</Link>}>Evolução dos objetivos</CardTitle>
            {r.goals.length ? (
              <ul className="space-y-3">
                {r.goals.map((g) => (
                  <li key={g.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-semibold">{g.name}</span>
                      <span className="shrink-0 tabular text-ink-3">
                        {m(g.current)} / {m(g.target)} · <b className="text-ink">{pctFmt(g.pct, 0)}</b>
                      </span>
                    </div>
                    <Progress value={g.pct} tone={g.pct >= 100 ? "bg-pos" : "bg-ink"} size="sm" />
                    <p className="mt-1 text-[11px] text-ink-3">
                      {g.pct >= 100
                        ? "Meta alcançada"
                        : g.projection.monthsLeft
                          ? `No ritmo de ${m(g.projection.monthlyPace)}/mês: ~${g.projection.monthsLeft} ${g.projection.monthsLeft === 1 ? "mês" : "meses"}`
                          : "Sem aportes recentes para projetar"}
                      {g.requiredMonthly ? ` · necessário ${m(g.requiredMonthly)}/mês para a data prevista` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Nenhum objetivo cadastrado.</p>
            )}
          </Card>
        </div>
      </Section>

      {/* Inteligência financeira */}
      <Section title="Inteligência financeira" description={`Insights calculados a partir dos seus dados reais (referência: ${monthLabel(monthKey(period.to), true)}).`}>
        <Card className="print-block">
          {r.insights.length ? (
            <ul className="grid gap-2.5 md:grid-cols-2">
              {r.insights.map((i) => (
                <li key={i.id} className="flex gap-2.5 rounded-xl bg-surface p-3 text-[13px] leading-snug">
                  <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", { pos: "bg-pos", neg: "bg-neg", warn: "bg-warn", info: "bg-info" }[i.tone])} />
                  {i.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-3">
              <Lightbulb size={16} /> Ainda não há dados suficientes para gerar insights. Registre movimentações por pelo menos dois meses.
            </p>
          )}
        </Card>
      </Section>
    </div>
  );
}
