import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { recurrenceOccurrences } from "@/modules/recurring/service";
import { FREQUENCY_LABEL } from "@/modules/recurring/rules";
import { Recurrence } from "@/models";
import { connectDB } from "@/lib/db";
import { formatDate, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Stat } from "@/components/ui/stat";
import { PayButton } from "@/components/finance/pay-button";
import type { Frequency } from "@/models/Recurrence";

export const metadata = { title: "Histórico da recorrência" };

export default async function RecurrenceDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const occurrences = await recurrenceOccurrences(user.id, id).catch(() => notFound());
  await connectDB();
  const rec = await Recurrence.findOne({ _id: id, userId: user.id }).lean();
  if (!rec) notFound();
  const t = today(user.preferences.timezone);
  const fmt = user.preferences.dateFormat;
  const paid = occurrences.filter((o) => o.status === "paid");
  const onCard = !!rec.creditCardId;
  return (
    <>
      <Link href="/recurring" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink">
        <ArrowLeft size={14} /> Recorrentes
      </Link>
      <PageHeader title={rec.description} description={`${FREQUENCY_LABEL[rec.frequency as Frequency]} · ${formatMoney(rec.amount, user.preferences.currency)} · início em ${formatDate(rec.startDate, fmt)}`} />
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={onCard ? "Cobranças no cartão" : "Ocorrências pagas"} value={paid.length} />
        <Stat label={onCard ? "Total cobrado" : "Total pago"} value={formatMoney(paid.reduce((s, o) => s + o.amount, 0), user.preferences.currency)} />
        <Stat label={onCard ? "Previstas" : "Pendentes"} value={occurrences.filter((o) => o.status === "pending").length} />
      </section>
      {onCard && (
        <p className="mb-3 text-xs text-ink-3">
          Cobrança no cartão: cada ocorrência entra na fatura do mês e vira despesa na data da cobrança. O pagamento é feito pela fatura, em{" "}
          <Link href={`/cards/${rec.creditCardId}`} className="font-semibold underline">
            Cartões
          </Link>
          .
        </p>
      )}
      <p className="mb-3 text-xs text-ink-3">Para alterar o valor ou cancelar apenas uma ocorrência, edite-a em Movimentações. Ocorrências editadas individualmente não são afetadas por mudanças na recorrência.</p>
      <Card className="p-2 sm:p-3">
        <ul className="divide-y divide-line">
          {occurrences.map((o) => {
            const overdue = o.status === "pending" && o.dueDate && o.dueDate < t;
            return (
              <li key={String(o._id)} className="flex flex-wrap items-center gap-3 px-2 py-3 text-sm">
                <span className="w-24 tabular font-semibold">{formatDate(o.occurrenceDate ?? o.date, fmt)}</span>
                <span className="min-w-0 flex-1 truncate">{o.description}</span>
                {o.overridden && <Badge tone="info">Editada</Badge>}
                {onCard && o.invoiceMonth && <span className="text-xs text-ink-3">fatura {o.invoiceMonth.slice(5)}/{o.invoiceMonth.slice(0, 4)}</span>}
                {o.status === "paid" && <Badge tone="pos">{onCard ? "Cobrada" : `Paga ${o.paidAt ? `em ${formatDate(o.paidAt, fmt)}` : ""}`}</Badge>}
                {o.status === "cancelled" && <Badge>Cancelada</Badge>}
                {o.status === "pending" && <Badge tone={onCard ? "info" : overdue ? "neg" : "warn"}>{onCard ? "Prevista" : overdue ? "Atrasada" : "Pendente"}</Badge>}
                <Money value={o.amount} className="w-24 text-right font-bold" />
                <span className="w-24 text-right">{onCard ? null : o.status === "pending" ? <PayButton id={String(o._id)} kind={o.kind} /> : o.status === "paid" ? <PayButton id={String(o._id)} kind={o.kind} undo /> : null}</span>
              </li>
            );
          })}
          {!occurrences.length && <li className="p-4 text-sm text-ink-3">Nenhuma ocorrência gerada.</li>}
        </ul>
      </Card>
    </>
  );
}
