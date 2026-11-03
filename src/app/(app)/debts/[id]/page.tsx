import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { debtInstallments, listDebts } from "@/modules/debts/service";
import { DEBT_KIND_LABEL } from "@/modules/debts/schemas";
import { formatDate, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Stat } from "@/components/ui/stat";
import { EditDebtButton } from "../_components/debt-form";
import { DeleteDebtButton, ExtraPaymentButton, InstallmentButton } from "../_components/debt-actions";

export const metadata = { title: "Dívida" };

export default async function DebtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const tz = user.preferences.timezone;
  const fmt = user.preferences.dateFormat;
  const cur = user.preferences.currency;
  const [{ debt, items }, all] = await Promise.all([debtInstallments(user.id, id), listDebts(user.id, tz)]);
  const summary = all.find((d) => d.id === id)!;
  const t = today(tz);
  const installments = items.filter((i) => i.installment?.number);
  const extras = items.filter((i) => !i.installment?.number);
  const maxAmount = Math.max(1, ...installments.map((i) => i.amount));

  return (
    <>
      <Link href="/debts" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink">
        <ArrowLeft size={14} /> Dívidas
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{debt.name}</h1>
          <p className="mt-1 text-sm text-ink-3">
            {DEBT_KIND_LABEL[debt.kind as keyof typeof DEBT_KIND_LABEL]}
            {debt.creditor ? ` · ${debt.creditor}` : ""} · contratada em {formatDate(debt.contractDate, fmt)}
            {debt.interestRate != null ? ` · ${String(debt.interestRate).replace(".", ",")}% a.m.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {debt.status === "active" && <ExtraPaymentButton debtId={id} accountId={String(debt.accountId)} outstanding={summary.outstanding} />}
          <EditDebtButton debt={{ id, name: debt.name, creditor: debt.creditor ?? "", kind: debt.kind, interestRate: debt.interestRate ?? null, accountId: String(debt.accountId), notes: debt.notes ?? "" }} />
          <DeleteDebtButton id={id} redirectTo="/debts" />
        </div>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Valor total" value={formatMoney(debt.totalAmount, cur)} hint={`${debt.installmentsCount}× ${formatMoney(debt.installmentAmount, cur)}`} />
        <Stat label="Já pago" value={formatMoney(summary.paid, cur)} tone="pos" />
        <Stat label="Saldo devedor" value={formatMoney(summary.outstanding, cur)} tone={summary.outstanding > 0 ? "neg" : undefined} hint={summary.overdueCount ? `${summary.overdueCount} parcela(s) em atraso` : undefined} />
        <Stat label="Quitação prevista" value={summary.payoffDate ? formatDate(summary.payoffDate, fmt) : debt.status === "paid_off" ? "Quitada" : "—"} hint={`${summary.pendingCount} parcela(s) restante(s)`} />
      </section>

      <Card className="mb-6">
        <CardTitle action={<span className="text-xs font-bold tabular">{Math.round(summary.progress)}%</span>}>Evolução da dívida</CardTitle>
        <Progress value={summary.progress} tone="bg-pos" />
        <div className="mt-5 flex h-24 items-end gap-[3px]" aria-label="Parcelas ao longo do tempo">
          {installments.map((i) => {
            const overdue = i.status === "pending" && i.dueDate && i.dueDate < t;
            return (
              <div
                key={String(i._id)}
                title={`${i.installment?.number}/${i.installment?.total} · ${formatDate(i.dueDate, fmt)} · ${formatMoney(i.amount, cur)}`}
                className={cn("flex-1 rounded-t-[4px]", i.status === "paid" ? "bg-pos" : i.status === "cancelled" ? "bg-ink-4/40" : overdue ? "bg-neg" : "bg-ink/80")}
                style={{ height: `${Math.max(6, (i.amount / maxAmount) * 100)}%` }}
              />
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-ink-3">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-pos" /> Paga</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink/80" /> Pendente</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neg" /> Atrasada</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-4/40" /> Cancelada/amortizada</span>
        </div>
      </Card>

      <Card>
        <CardTitle>Parcelas</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-3">
                <th className="pb-2 font-semibold">Parcela</th>
                <th className="pb-2 font-semibold">Vencimento</th>
                <th className="pb-2 text-right font-semibold">Valor</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...installments, ...extras].map((i) => {
                const overdue = i.status === "pending" && i.dueDate && i.dueDate < t;
                return (
                  <tr key={String(i._id)}>
                    <td className="py-2.5 font-semibold">{i.installment?.number ? `${i.installment.number}/${i.installment.total}` : "Amortização"}</td>
                    <td className="py-2.5 tabular text-ink-2">{formatDate(i.dueDate ?? i.date, fmt)}</td>
                    <td className="py-2.5 text-right tabular font-semibold">{formatMoney(i.amount, cur)}</td>
                    <td className="py-2.5">
                      {i.status === "paid" ? (
                        <Badge tone="pos">Paga{i.paidAt ? ` em ${formatDate(i.paidAt, fmt)}` : ""}</Badge>
                      ) : i.status === "cancelled" ? (
                        <Badge>Cancelada</Badge>
                      ) : overdue ? (
                        <Badge tone="neg">Atrasada</Badge>
                      ) : (
                        <Badge tone="warn">Pendente</Badge>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      {i.installment?.number && i.status !== "cancelled" && <InstallmentButton debtId={id} txId={String(i._id)} paid={i.status === "paid"} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
