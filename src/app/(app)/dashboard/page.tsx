import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, CreditCard, Lightbulb, Repeat, Sparkles, Target, Wallet } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { getDashboard } from "@/modules/dashboard/service";
import { resolvePeriod, type PeriodParams } from "@/lib/period";
import { formatDate, monthKey, toISODate, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { serialize, cn } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { Money } from "@/components/ui/money";
import { Progress, ProgressRing } from "@/components/ui/progress";
import { Delta, Stat } from "@/components/ui/stat";
import { CategoryIcon } from "@/components/ui/icon";
import { BalanceLine, CategoryDonut, IncomeExpenseBars, SpendingArea } from "@/components/dashboard/charts";
import { PeriodFilter } from "@/components/finance/period-filter";
import { PayButton } from "@/components/finance/pay-button";
import { Row } from "@/components/finance/row";
import { Greeting } from "@/components/dashboard/greeting";

export const metadata = { title: "Dashboard" };

type Populated = { name: string; icon: string; color: string } | null;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<PeriodParams> }) {
  const user = await requireUser();
  const tz = user.preferences.timezone;
  const period = resolvePeriod(await searchParams, tz);
  const d = await getDashboard(user.id, tz, period, user.preferences.alertThresholds, user.preferences.dueSoonDays);
  const fmt = user.preferences.dateFormat;
  const cur = user.preferences.currency;
  const m = (v: number) => formatMoney(v, cur);
  const empty = d.series.every((s) => !s.income && !s.expense) && d.worth.accounts === 0;
  const t = today(tz);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      {/* Coluna principal */}
      <div className="min-w-0 space-y-6">
        <Card className="relative flex flex-col gap-4 overflow-hidden sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="relative z-10">
            <h1 className="text-[26px] font-extrabold tracking-tight">Olá, {user.name.split(" ")[0]}!</h1>
            <p className="mt-1 text-sm text-ink-3">{d.totals.result >= 0 ? "Que bom ver você de novo. Suas contas estão no azul." : "Que bom ver você de novo. Vamos equilibrar este período?"}</p>
            <div className="mt-4">
              <PeriodFilter mode={period.mode} month={period.month ?? monthKey(t)} year={String(period.from.getUTCFullYear())} from={toISODate(period.from)} to={toISODate(period.to)} />
            </div>
          </div>
          <Greeting />
        </Card>

        {empty && (
          <EmptyState
            icon={<Wallet size={20} />}
            title="Comece cadastrando suas contas"
            description="Informe o saldo atual de cada conta e registre suas movimentações. O dashboard é calculado a partir dos seus dados reais."
            action={
              <Link href="/accounts" className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">
                Cadastrar conta
              </Link>
            }
          />
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Saldo disponível" value={m(d.worth.accounts)} hint={<>Previsto: <b className="text-ink-2">{m(d.forecastBalance)}</b></>} icon={<Wallet size={15} />} tone={d.worth.accounts < 0 ? "neg" : undefined} />
          <Stat label="Receitas" value={m(d.totals.income)} hint={<Delta current={d.totals.income} previous={d.prevTotals.income} />} icon={<ArrowUpRight size={15} />} tone="pos" />
          <Stat label="Despesas" value={m(d.totals.expense)} hint={<Delta current={d.totals.expense} previous={d.prevTotals.expense} invert />} icon={<ArrowDownRight size={15} />} tone="neg" />
          <Stat
            label="Resultado"
            value={formatMoney(d.totals.result, cur, { sign: true })}
            hint={d.totals.pendingIncome || d.totals.pendingExpense ? `${m(d.totals.pendingIncome)} a receber · ${m(d.totals.pendingExpense)} a pagar` : `Período: ${period.label}`}
            tone={d.totals.result >= 0 ? "pos" : "neg"}
          />
        </section>

        <section>
          <CardTitle action={<Link href="/transactions?status=pending" className="text-xs font-semibold text-ink-3 hover:text-ink">Ver todas</Link>}>Próximos vencimentos</CardTitle>
          {d.upcoming.length ? (
            <div className="space-y-2">
              {d.upcoming.map((tx) => {
                const c = tx.categoryId as unknown as Populated;
                const days = Math.round(((tx.dueDate as Date).getTime() - t.getTime()) / 86400000);
                return (
                  <Row
                    key={String(tx._id)}
                    icon={c?.icon}
                    color={c?.color}
                    title={tx.description}
                    subtitle={c?.name ?? "Sem categoria"}
                    meta={
                      <>
                        <span className="flex items-center gap-1.5">
                          <CalendarClock size={14} /> {days === 0 ? "Hoje" : days === 1 ? "Amanhã" : `em ${days} dias`}
                        </span>
                        <Money value={tx.kind === "income" ? tx.amount : -tx.amount} colored className="w-24 text-right" />
                      </>
                    }
                    action={<PayButton id={String(tx._id)} kind={tx.kind} />}
                  />
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl bg-muted px-4 py-5 text-sm text-ink-3">Nenhum vencimento nos próximos dias.</p>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle>Receitas × despesas</CardTitle>
            <IncomeExpenseBars data={serialize(d.series.slice(-6))} />
          </Card>
          <Card>
            <CardTitle action={<span className="text-xs text-ink-3">{period.label}</span>}>Despesas por categoria</CardTitle>
            {d.byCategory.length ? <CategoryDonut data={d.byCategory} /> : <p className="py-10 text-center text-sm text-ink-3">Sem despesas no período.</p>}
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle>Maiores gastos e % da renda</CardTitle>
            {d.byCategory.length ? (
              <ul className="space-y-3">
                {d.byCategory.slice(0, 6).map((c) => (
                  <li key={c.name}>
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <CategoryIcon name={c.icon} size={14} className="text-ink-3" />
                      <span className="flex-1 font-semibold">{c.name}</span>
                      <span className="tabular font-bold">{m(c.total)}</span>
                      <span className="w-14 text-right tabular text-ink-3">{c.pctOfIncome != null ? `${c.pctOfIncome.toFixed(1).replace(".", ",")}%` : "—"}</span>
                    </div>
                    <Progress value={(c.total / d.byCategory[0].total) * 100} tone="bg-ink" size="sm" />
                  </li>
                ))}
                <li className="pt-1 text-[11px] text-ink-4">% = participação na receita efetivada do período</li>
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-ink-3">Sem despesas no período.</p>
            )}
          </Card>
          <Card>
            <CardTitle>Evolução dos gastos</CardTitle>
            <SpendingArea data={serialize(d.series)} />
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2" id="alertas">
          <Card>
            <CardTitle action={d.overdue.length ? <Badge tone="neg">{m(d.overdueTotal)}</Badge> : undefined}>Contas atrasadas</CardTitle>
            {d.overdue.length ? (
              <ul className="space-y-2">
                {d.overdue.slice(0, 6).map((tx) => (
                  <li key={String(tx._id)} className="flex items-center gap-3 rounded-xl bg-surface p-3 text-sm">
                    <AlertTriangle size={16} className="shrink-0 text-neg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{tx.description}</p>
                      <p className="text-xs text-neg">Venceu em {formatDate(tx.dueDate, fmt)}</p>
                    </div>
                    <Money value={tx.amount} className="font-bold" />
                    <PayButton id={String(tx._id)} kind={tx.kind} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Nenhuma conta atrasada. 👏</p>
            )}
          </Card>
          <Card>
            <CardTitle action={<Link href="/budgets" className="text-xs font-semibold text-ink-3 hover:text-ink">Limites</Link>}>Alertas de limites</CardTitle>
            {d.budgetAlerts.length ? (
              <ul className="space-y-3">
                {d.budgetAlerts.slice(0, 5).map((b) => (
                  <li key={b.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold">{b.name}</span>
                      <span className={cn("font-bold tabular", b.pct >= 100 ? "text-neg" : b.pct >= 75 ? "text-warn" : "text-ink-2")}>
                        {Math.round(b.pct)}% · {b.available >= 0 ? `${m(b.available)} livres` : `${m(-b.available)} acima`}
                      </span>
                    </div>
                    <Progress value={b.pct} size="sm" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">{d.budgets.length ? "Todos os limites estão sob controle." : "Defina limites mensais por categoria para receber alertas."}</p>
            )}
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle action={<Link href="/recurring" className="text-xs font-semibold text-ink-3 hover:text-ink">Gerenciar</Link>}>Despesas recorrentes</CardTitle>
            {d.recurringNext.length ? (
              <ul className="divide-y divide-line text-sm">
                {d.recurringNext.map((r) => (
                  <li key={String(r._id)} className="flex items-center gap-3 py-2.5">
                    <Repeat size={14} className="text-ink-3" />
                    <span className="flex-1 truncate font-medium">{r.description}</span>
                    <span className="text-xs text-ink-3">{formatDate(r.dueDate, fmt)}</span>
                    <Money value={r.amount} className="w-24 text-right font-semibold" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Nenhuma recorrência ativa.</p>
            )}
          </Card>
          <Card>
            <CardTitle action={<Link href="/cards" className="text-xs font-semibold text-ink-3 hover:text-ink">Cartões</Link>}>Parcelas futuras</CardTitle>
            {d.installments.length ? (
              <ul className="divide-y divide-line text-sm">
                {d.installments.map((i) => (
                  <li key={String(i._id)} className="flex items-center gap-3 py-2.5">
                    <CreditCard size={14} className="text-ink-3" />
                    <span className="flex-1 truncate font-medium">{i.description}</span>
                    <span className="text-xs text-ink-3">{formatDate(i.date, fmt)}</span>
                    <Money value={i.amount} className="w-24 text-right font-semibold" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Nenhuma parcela futura no cartão.</p>
            )}
          </Card>
        </section>
      </div>

      {/* Coluna lateral */}
      <aside className="min-w-0 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted p-4">
            <div className="flex items-center gap-3">
              <span className={cn("text-[34px] font-extrabold leading-none tracking-tight tabular", d.commitment != null && d.commitment > 90 && "text-neg")}>
                {d.commitment != null ? Math.round(d.commitment) : "—"}
                <span className="text-lg">%</span>
              </span>
            </div>
            <p className="mt-2 text-xs leading-tight text-ink-3">da renda comprometida</p>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <span className="text-[22px] font-extrabold leading-none tracking-tight tabular">{formatMoney(d.worth.savings, cur, { compact: true })}</span>
            <p className="mt-2 text-xs leading-tight text-ink-3">reservado em caixinhas</p>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <span className={cn("text-[22px] font-extrabold leading-none tracking-tight tabular", d.worth.debts + d.worth.cardDebt > 0 && "text-neg")}>
              {formatMoney(d.worth.debts + d.worth.cardDebt, cur, { compact: true })}
            </span>
            <p className="mt-2 text-xs leading-tight text-ink-3">em dívidas e faturas</p>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <span className={cn("text-[22px] font-extrabold leading-none tracking-tight tabular", d.worth.netWorth < 0 && "text-neg")}>{formatMoney(d.worth.netWorth, cur, { compact: true })}</span>
            <p className="mt-2 text-xs leading-tight text-ink-3">patrimônio líquido</p>
          </div>
        </div>

        <div>
          <CardTitle>Suas estatísticas</CardTitle>
          <div className="mb-3 flex gap-5 text-[13px] font-semibold">
            <span>Evolução do saldo</span>
            <span className="text-ink-4">12 meses</span>
          </div>
          <BalanceLine data={serialize(d.series)} />
        </div>

        <Card>
          <CardTitle action={<Lightbulb size={16} className="text-ink-3" />}>Inteligência financeira</CardTitle>
          {d.insights.length ? (
            <ul className="space-y-2.5">
              {d.insights.map((i) => (
                <li key={i.id} className="flex gap-2.5 rounded-xl bg-surface p-3 text-[13px] leading-snug">
                  <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", { pos: "bg-pos", neg: "bg-neg", warn: "bg-warn", info: "bg-info" }[i.tone])} />
                  {i.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Os insights aparecem quando houver dados suficientes (ao menos dois meses de movimentações).</p>
          )}
        </Card>

        <Card className="relative overflow-hidden">
          <CardTitle action={<Link href="/goals" className="text-xs font-semibold text-ink-3 hover:text-ink">Ver todos</Link>}>Objetivos em andamento</CardTitle>
          {d.goals.length ? (
            <ul className="space-y-3">
              {d.goals.map((g) => (
                <li key={g.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                  <ProgressRing value={g.pct} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{g.name}</p>
                    <p className="text-xs text-ink-3">
                      {m(g.current)} de {m(g.target)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold">Planeje o próximo passo</p>
                <p className="mt-1 text-xs text-ink-3">Crie um objetivo e acompanhe o progresso mês a mês.</p>
                <Link href="/goals" className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-xs font-semibold text-white">
                  <Target size={13} /> Criar objetivo
                </Link>
              </div>
              <Sparkles size={56} strokeWidth={1.2} className="shrink-0 text-ink" />
            </div>
          )}
        </Card>
      </aside>
    </div>
  );
}
