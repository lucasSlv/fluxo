import Link from "next/link";
import { PiggyBank, Target } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { listGoals } from "@/modules/goals/service";
import { formatDate, toISODate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { serialize } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, type Tone } from "@/components/ui/badge";
import { Progress, ProgressRing } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty";
import { Stat } from "@/components/ui/stat";
import { GoalFormButton } from "./_components/goal-form";
import { ContributionsButton, DeleteGoalButton } from "./_components/goal-actions";

export const metadata = { title: "Objetivos" };

const PRIORITY: Record<string, { label: string; tone: Tone }> = { high: { label: "Prioridade alta", tone: "neg" }, medium: { label: "Prioridade média", tone: "warn" }, low: { label: "Prioridade baixa", tone: "neutral" } };
const STATUS: Record<string, { label: string; tone: Tone }> = { active: { label: "Em andamento", tone: "info" }, achieved: { label: "Alcançado", tone: "pos" }, paused: { label: "Pausado", tone: "neutral" }, cancelled: { label: "Cancelado", tone: "neutral" } };

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await listGoals(user.id, user.preferences.timezone);
  const fmt = user.preferences.dateFormat;
  const cur = user.preferences.currency;
  const m = (v: number) => formatMoney(v, cur);
  const active = goals.filter((g) => g.status === "active");

  return (
    <>
      <PageHeader title="Objetivos" description="Planeje conquistas e acompanhe o progresso com base nos seus aportes reais." actions={<GoalFormButton />} />
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Em andamento" value={active.length} />
        <Stat label="Acumulado" value={m(active.reduce((s, g) => s + g.current, 0))} tone="pos" />
        <Stat label="Falta juntar" value={m(active.reduce((s, g) => s + g.projection.remaining, 0))} />
        <Stat label="Alcançados" value={goals.filter((g) => g.status === "achieved" || g.current >= g.target).length} />
      </section>

      {goals.length === 0 ? (
        <EmptyState icon={<Target size={20} />} title="Nenhum objetivo ainda" description="Comprar uma moto, viajar, montar a reserva de emergência… Crie um objetivo e acompanhe mês a mês." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => {
            const reached = g.current >= g.target;
            const contributions = serialize((g.contributions ?? []) as unknown as { _id: string; amount: number; date: Date; note: string }[]);
            return (
              <article key={g.id} className="flex flex-col rounded-2xl bg-muted p-5">
                <div className="mb-4 flex items-start gap-3">
                  <ProgressRing value={g.pct} size={54} stroke={5} className={reached ? "text-pos" : undefined} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">{g.name}</p>
                    <p className="truncate text-xs text-ink-3">{g.category || g.description || "Objetivo financeiro"}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge tone={STATUS[g.status].tone}>{STATUS[g.status].label}</Badge>
                      <Badge tone={PRIORITY[g.priority].tone}>{PRIORITY[g.priority].label}</Badge>
                    </div>
                  </div>
                </div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <b className="tabular">{m(g.current)}</b>
                  <span className="tabular text-ink-3">de {m(g.target)}</span>
                </div>
                <Progress value={g.pct} tone={reached ? "bg-pos" : "bg-ink"} />
                <div className="mt-3 space-y-1 text-xs text-ink-3">
                  {g.targetDate && <p>Conclusão prevista: {formatDate(g.targetDate, fmt)}</p>}
                  {g.box && (
                    <p className="flex items-center gap-1">
                      <PiggyBank size={12} /> Caixinha:{" "}
                      <Link href={`/savings/${String(g.box._id)}`} className="font-semibold text-ink-2 hover:underline">
                        {g.box.name}
                      </Link>
                    </p>
                  )}
                  {g.status === "active" && !reached && g.projection.monthsLeft != null && (
                    <p className="text-ink-2">
                      No ritmo atual ({m(g.projection.monthlyPace)}/mês), conclui em ~{g.projection.monthsLeft} {g.projection.monthsLeft === 1 ? "mês" : "meses"}
                      {g.projection.eta ? ` (${formatDate(g.projection.eta, fmt).slice(3)})` : ""}.
                    </p>
                  )}
                  {g.status === "active" && !reached && g.requiredMonthly != null && <p>Para cumprir o prazo: {m(g.requiredMonthly)}/mês.</p>}
                  {reached && <p className="font-semibold text-pos">Meta atingida! 🎉</p>}
                </div>
                <div className="mt-auto flex items-center justify-end gap-1 pt-4">
                  {!g.box && <ContributionsButton goalId={g.id} current={g.current} contributions={contributions} />}
                  {g.box && (
                    <Link href={`/savings/${String(g.box._id)}`} className="inline-flex h-8 items-center rounded-lg bg-ink px-3 text-xs font-semibold text-white">
                      Movimentar caixinha
                    </Link>
                  )}
                  <GoalFormButton
                    initial={{
                      id: g.id,
                      name: g.name,
                      description: g.description ?? "",
                      target: g.target,
                      startDate: toISODate(g.startDate),
                      targetDate: g.targetDate ? toISODate(g.targetDate) : "",
                      priority: g.priority as "low" | "medium" | "high",
                      category: g.category ?? "",
                      status: g.status as "active",
                      savingsBoxId: g.box ? String(g.box._id) : "",
                    }}
                  />
                  <DeleteGoalButton id={g.id} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
