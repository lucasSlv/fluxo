import Link from "next/link";
import { AlertTriangle, CalendarClock, Landmark } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { listDebts } from "@/modules/debts/service";
import { DEBT_KIND_LABEL } from "@/modules/debts/schemas";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty";
import { IconTile } from "@/components/ui/icon";
import { NewDebtButton } from "./_components/debt-form";

export const metadata = { title: "Dívidas" };

export default async function DebtsPage() {
  const user = await requireUser();
  const debts = await listDebts(user.id, user.preferences.timezone);
  const fmt = user.preferences.dateFormat;
  const cur = user.preferences.currency;
  const active = debts.filter((d) => d.status === "active");
  const outstanding = active.reduce((s, d) => s + d.outstanding, 0);
  const monthly = active.reduce((s, d) => s + (d.pendingCount ? d.installmentAmount : 0), 0);
  const overdue = active.reduce((s, d) => s + d.overdueAmount, 0);
  const statusBadge = (s: string) => (s === "paid_off" ? <Badge tone="pos">Quitada</Badge> : s === "cancelled" ? <Badge>Cancelada</Badge> : null);

  return (
    <>
      <PageHeader title="Dívidas" description="Empréstimos, financiamentos, acordos e compromissos parcelados." actions={<NewDebtButton />} />
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Saldo devedor" value={formatMoney(outstanding, cur)} tone={outstanding > 0 ? "neg" : undefined} />
        <Stat label="Parcelas por mês" value={formatMoney(monthly, cur)} hint="Comprometimento mensal" />
        <Stat label="Em atraso" value={formatMoney(overdue, cur)} tone={overdue > 0 ? "neg" : undefined} />
        <Stat label="Dívidas ativas" value={active.length} hint={`${debts.filter((d) => d.status === "paid_off").length} quitadas`} />
      </section>

      {debts.length === 0 ? (
        <EmptyState icon={<Landmark size={20} />} title="Nenhuma dívida cadastrada" description="Cadastre empréstimos, financiamentos ou acordos para acompanhar parcelas, atrasos e previsão de quitação." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {debts.map((d) => (
            <Link key={d.id} href={`/debts/${d.id}`} className="block rounded-2xl bg-muted p-5 transition hover:bg-neutral-200/60">
              <div className="mb-4 flex items-start gap-3">
                <IconTile name="landmark" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{d.name}</p>
                  <p className="truncate text-xs text-ink-3">
                    {DEBT_KIND_LABEL[d.kind as keyof typeof DEBT_KIND_LABEL]}
                    {d.creditor ? ` · ${d.creditor}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {statusBadge(d.status)}
                  {d.overdueCount > 0 && (
                    <Badge tone="neg">
                      <AlertTriangle size={11} /> {d.overdueCount} em atraso
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-ink-3">
                  Pago <b className="tabular text-ink">{formatMoney(d.paid, cur)}</b>
                </span>
                <span className="text-ink-3">
                  Restante <b className="tabular text-ink">{formatMoney(d.outstanding, cur)}</b>
                </span>
              </div>
              <Progress value={d.progress} tone="bg-pos" />
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
                <span className="tabular">{formatMoney(d.installmentAmount, cur)}/parcela</span>
                {d.nextDue && (
                  <span className="flex items-center gap-1">
                    <CalendarClock size={12} /> Próxima: {formatDate(d.nextDue, fmt)}
                  </span>
                )}
                {d.payoffDate && <span>Quitação prevista: {formatDate(d.payoffDate, fmt)}</span>}
                <span>{Math.round(d.progress)}% pago</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
