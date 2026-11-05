import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { cardInvoices, invoiceItems, listCards, upcomingCardInstallments } from "@/modules/credit-cards/service";
import { deleteInvoicePaymentAction } from "@/modules/credit-cards/actions";
import { INVOICE_STATUS_LABEL, type InvoiceStatus } from "@/modules/credit-cards/rules";
import { formatDate, monthLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { serialize } from "@/lib/utils";
import { Badge, type Tone } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { Stat } from "@/components/ui/stat";
import { LinkTabs } from "@/components/ui/tabs";
import { CategoryIcon } from "@/components/ui/icon";
import { CardVisual, type CardItem } from "../_components/cards-view";
import { InvoiceActions } from "../_components/invoice-actions";

export const metadata = { title: "Cartão" };

const STATUS_TONE: Record<InvoiceStatus, Tone> = { open: "info", future: "neutral", closed: "warn", paid: "pos", overdue: "neg" };

export default async function CardDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ invoice?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const tz = user.preferences.timezone;
  const fmt = user.preferences.dateFormat;
  const cur = user.preferences.currency;
  const card = (await listCards(user.id, { includeArchived: true })).find((c) => c.id === id);
  if (!card) notFound();

  const [invoices, future] = await Promise.all([cardInvoices(user.id, id, tz), upcomingCardInstallments(user.id, tz, 500)]);
  const current = invoices.find((i) => i.status === "open") ?? invoices.at(-1)!;
  const selected = invoices.find((i) => i.month === sp.invoice) ?? current;
  const items = await invoiceItems(user.id, id, selected.month);
  const charges = items.filter((i) => i.kind === "expense");
  const payments = items.filter((i) => i.kind === "card_payment");
  const cardFuture = future.filter((f) => String((f.creditCardId as unknown as { _id: unknown })?._id) === id);
  const pending = invoices.filter((i) => i.status === "closed" || i.status === "overdue");

  return (
    <>
      <Link href="/cards" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink">
        <ArrowLeft size={14} /> Cartões
      </Link>

      <div className="mb-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-3">
          <CardVisual c={serialize(card) as unknown as CardItem} />
          <div className="px-1">
            <div className="mb-1.5 flex justify-between text-xs font-semibold text-ink-3">
              <span>Limite usado</span>
              <span className="tabular">
                {formatMoney(card.used, cur)} / {formatMoney(card.limit, cur)}
              </span>
            </div>
            <Progress value={card.limit ? (card.used / card.limit) * 100 : 0} size="sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 content-start gap-3">
          <Stat label="Fatura atual" value={formatMoney(current.total, cur)} hint={`Fecha em ${formatDate(current.closingDate, fmt)}`} />
          <Stat label="A pagar (fechadas)" value={formatMoney(pending.reduce((s, i) => s + i.remaining, 0), cur)} tone={pending.some((i) => i.status === "overdue") ? "neg" : undefined} hint={pending.length ? `${pending.length} fatura(s)` : "Nada pendente"} />
          <Stat label="Limite disponível" value={formatMoney(card.available, cur)} tone={card.available < 0 ? "neg" : "pos"} />
          <Stat label="Cobranças futuras" value={formatMoney(cardFuture.reduce((s, f) => s + f.amount, 0), cur)} hint={`${cardFuture.length} parcela(s) e assinatura(s)`} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <LinkTabs
          active={selected.month}
          items={invoices.map((i) => ({ value: i.month, href: `/cards/${id}?invoice=${i.month}`, label: `${monthLabel(i.month)}${i.month === current.month ? " •" : ""}` }))}
        />
        {!card.archived && (
          <InvoiceActions
            cardId={id}
            invoiceMonth={selected.month}
            remaining={selected.remaining}
            defaultAccountId={card.defaultAccountId ? String(card.defaultAccountId) : ""}
            canPay={selected.remaining > 0}
          />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardTitle action={<Badge tone={STATUS_TONE[selected.status]}>{INVOICE_STATUS_LABEL[selected.status]}</Badge>}>
            Fatura de {monthLabel(selected.month, true)}
          </CardTitle>
          <div className="mb-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <Info label="Fechamento" value={formatDate(selected.closingDate, fmt)} />
            <Info label="Vencimento" value={formatDate(selected.dueDate, fmt)} />
            <Info label="Total" value={formatMoney(selected.total, cur)} />
            <Info label="Restante" value={formatMoney(selected.remaining, cur)} strong />
          </div>
          {charges.length ? (
            <ul className="divide-y divide-line">
              {charges.map((c) => {
                const cat = c.categoryId as unknown as { name: string; icon: string; color: string } | null;
                return (
                  <li key={String(c._id)} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface" style={{ color: cat?.color }}>
                      <CategoryIcon name={cat?.icon} size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.description}</p>
                      <p className="text-xs text-ink-3">
                        {formatDate(c.date, fmt)} · {cat?.name ?? "Sem categoria"}
                        {c.recurrenceId ? " · recorrente" : ""}
                        {c.status === "pending" ? " · prevista" : ""}
                      </p>
                    </div>
                    <Money value={c.amount} className="font-bold" />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-ink-3">Nenhuma compra nesta fatura.</p>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardTitle>Pagamentos da fatura</CardTitle>
            {payments.length ? (
              <ul className="space-y-2">
                {payments.map((p) => (
                  <li key={String(p._id)} className="flex items-center gap-2 rounded-xl bg-surface p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold tabular">{formatMoney(p.amount, cur)}</p>
                      <p className="text-xs text-ink-3">
                        {formatDate(p.date, fmt)} · {(p.accountId as unknown as { name: string } | null)?.name ?? "—"}
                      </p>
                    </div>
                    <ConfirmButton action={deleteInvoicePaymentAction.bind(null, String(p._id))} title="Estornar pagamento?" description="O valor volta para a conta e a fatura fica em aberto novamente." confirmLabel="Estornar" success="Pagamento estornado" size="icon">
                      <Trash2 size={14} />
                    </ConfirmButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Nenhum pagamento registrado.</p>
            )}
            <p className="mt-3 text-[11px] text-ink-4">Pagamentos de fatura não são despesas: as compras já foram contabilizadas.</p>
          </Card>

          <Card>
            <CardTitle>Cobranças futuras</CardTitle>
            {cardFuture.length ? (
              <ul className="divide-y divide-line text-sm">
                {cardFuture.slice(0, 12).map((f) => (
                  <li key={String(f._id)} className="flex items-center gap-2 py-2">
                    <span className="min-w-0 flex-1 truncate">{f.description}</span>
                    <span className="text-xs text-ink-3">{f.invoiceMonth ? monthLabel(f.invoiceMonth) : formatDate(f.date, fmt)}</span>
                    <Money value={f.amount} className="w-20 text-right font-semibold" />
                  </li>
                ))}
                {cardFuture.length > 12 && <li className="pt-2 text-xs text-ink-3">+ {cardFuture.length - 12} parcela(s)</li>}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Nenhuma cobrança futura.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-surface p-3">
      <p className="text-ink-3">{label}</p>
      <p className={strong ? "text-sm font-extrabold tabular" : "text-sm font-semibold tabular"}>{value}</p>
    </div>
  );
}
