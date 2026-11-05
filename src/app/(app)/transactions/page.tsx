import { ArrowLeftRight, CreditCard, Landmark, PiggyBank, Repeat } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { listTransactions } from "@/modules/transactions/service";
import { ensureRecurrencesGenerated } from "@/modules/recurring/service";
import { KIND_LABEL } from "@/modules/transactions/schemas";
import { formatDate, monthKey, monthRange, toISODate, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { IconTile } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { NewTransactionButton } from "./_components/new-button";
import { TransactionFilters } from "./_components/filters";
import { TxActions } from "./_components/tx-actions";

export const metadata = { title: "Movimentações" };

type SP = Record<string, string | undefined>;
type Ref = { _id: unknown; name: string; icon?: string; color?: string } | null;

const TABS: { value: string; label: string; params: Record<string, string> }[] = [
  { value: "all", label: "Todas", params: {} },
  { value: "income", label: "Receitas", params: { kind: "income" } },
  { value: "expense", label: "Despesas", params: { kind: "expense" } },
  { value: "transfer", label: "Transferências", params: { kind: "transfer,card_payment,savings_deposit,savings_withdrawal" } },
  { value: "pending", label: "A pagar/receber", params: { status: "pending" } },
  { value: "overdue", label: "Atrasadas", params: { status: "overdue" } },
];

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const tz = user.preferences.timezone;
  const sp = await searchParams;
  await ensureRecurrencesGenerated(user.id, tz);
  const t = today(tz);
  // Sem filtros, a lista vai até o fim do mês atual; lançamentos futuros ficam em "A pagar/receber" ou via filtro de datas.
  const capped = !sp.from && !sp.to && !sp.status && !sp.q;
  const res = await listTransactions(user.id, capped ? { ...sp, to: toISODate(monthRange(monthKey(t)).to) } : sp, tz);
  const fmt = user.preferences.dateFormat;
  const cur = user.preferences.currency;

  const active = TABS.find((tab) => Object.entries(tab.params).every(([k, v]) => sp[k] === v) && Object.keys(tab.params).length > 0)?.value ?? "all";
  const tabHref = (params: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && !["kind", "status", "page"].includes(k)) p.set(k, v);
    for (const [k, v] of Object.entries(params)) p.set(k, v);
    return `/transactions?${p.toString()}`;
  };
  const pageHref = (page: number) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    p.set("page", String(page));
    return `/transactions?${p.toString()}`;
  };
  const exportHref = `/api/export/transactions?${new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]).toString()}`;

  // Agrupa por dia para leitura mais fácil.
  const groups = new Map<string, typeof res.items>();
  for (const tx of res.items) {
    const key = toISODate(new Date(tx.date));
    groups.set(key, [...(groups.get(key) ?? []), tx]);
  }

  return (
    <div>
      <PageHeader
        title="Movimentações"
        description="Receitas, despesas e transferências. Previstas (pendentes) e efetivadas."
        actions={
          <>
            <a href={exportHref} className="inline-flex h-10 items-center rounded-xl bg-muted px-4 text-sm font-semibold hover:bg-neutral-200">
              Exportar CSV
            </a>
            <NewTransactionButton />
          </>
        }
      />
      <div className="mb-4">
        <LinkTabs active={active} items={TABS.map((tab) => ({ value: tab.value, label: tab.label, href: tabHref(tab.params) }))} />
      </div>
      <TransactionFilters />

      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-3">
        <span>
          <b className="text-ink">{res.total}</b> movimentações{capped && " até o fim deste mês"}
        </span>
        {res.sums.income != null && (
          <span>
            Receitas: <b className="tabular text-pos">{formatMoney(res.sums.income, cur)}</b>
          </span>
        )}
        {res.sums.expense != null && (
          <span>
            Despesas: <b className="tabular text-neg">{formatMoney(res.sums.expense, cur)}</b>
          </span>
        )}
      </div>

      {res.items.length === 0 ? (
        <EmptyState icon={<ArrowLeftRight size={20} />} title="Nenhuma movimentação encontrada" description="Ajuste os filtros ou registre uma nova movimentação." action={<NewTransactionButton />} />
      ) : (
        <div className="space-y-5">
          {[...groups.entries()].map(([day, items]) => (
            <section key={day}>
              <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-3">{formatDate(day, fmt)}</h3>
              <div className="space-y-2">
                {items.map((tx) => {
                  const cat = tx.categoryId as Ref;
                  const acc = tx.accountId as Ref;
                  const to = tx.toAccountId as Ref;
                  const card = tx.creditCardId as Ref;
                  const overdue = tx.status === "pending" && tx.dueDate && new Date(tx.dueDate) < t;
                  const sign = tx.kind === "income" ? 1 : tx.kind === "expense" ? -1 : 0;
                  const icon = cat?.icon ?? (tx.kind === "card_payment" ? "credit-card" : tx.kind.startsWith("savings") ? "piggy-bank" : "banknote");
                  const where =
                    tx.kind === "transfer"
                      ? `${acc?.name ?? "?"} → ${to?.name ?? "?"}`
                      : card
                        ? `Cartão ${card.name}${tx.invoiceMonth ? ` · fatura ${tx.invoiceMonth.slice(5)}/${tx.invoiceMonth.slice(0, 4)}` : ""}`
                        : (acc?.name ?? "");
                  const payable = ["income", "expense"].includes(tx.kind) && !tx.creditCardId && tx.status !== "cancelled";
                  const cardRecurring = !!tx.creditCardId && !!tx.recurrenceId;
                  const editable = ["income", "expense", "transfer"].includes(tx.kind) && (!tx.creditCardId || cardRecurring) && !tx.debtId && !tx.savingsBoxId && tx.status !== "cancelled";
                  return (
                    <div key={String(tx._id)} className={cn("flex items-center gap-3 rounded-2xl bg-muted p-3 sm:gap-4", tx.status === "cancelled" && "opacity-50")}>
                      <IconTile name={icon} color={cat?.color} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-[13px] font-bold">
                          {tx.description}
                          {!!tx.recurrenceId && <Repeat size={12} className="shrink-0 text-ink-3" aria-label="Recorrente" />}
                          {!!tx.debtId && <Landmark size={12} className="shrink-0 text-ink-3" aria-label="Dívida" />}
                          {!!tx.creditCardId && <CreditCard size={12} className="shrink-0 text-ink-3" aria-label="Cartão" />}
                          {!!tx.savingsBoxId && <PiggyBank size={12} className="shrink-0 text-ink-3" aria-label="Caixinha" />}
                        </p>
                        <p className="truncate text-xs text-ink-3">
                          {cat?.name ?? KIND_LABEL[tx.kind]} · {where}
                          {tx.nature === "fixed" && tx.kind === "expense" ? " · fixa" : ""}
                        </p>
                      </div>
                      <div className="hidden shrink-0 sm:block">
                        {tx.status === "cancelled" ? (
                          <Badge>Cancelada</Badge>
                        ) : tx.creditCardId && tx.status === "pending" ? (
                          <Badge tone="info">Prevista no cartão</Badge>
                        ) : overdue ? (
                          <Badge tone="neg">Atrasada · {formatDate(tx.dueDate, fmt)}</Badge>
                        ) : tx.status === "pending" ? (
                          <Badge tone="warn">Vence {formatDate(tx.dueDate, fmt)}</Badge>
                        ) : sign === 0 ? (
                          <Badge tone="info">{KIND_LABEL[tx.kind]}</Badge>
                        ) : null}
                      </div>
                      <span className={cn("w-28 shrink-0 text-right text-sm font-bold tabular", sign > 0 && "text-pos", sign < 0 && "text-ink")}>
                        {sign < 0 ? "−" : sign > 0 ? "+" : ""}
                        {formatMoney(tx.amount, cur)}
                      </span>
                      <TxActions
                        tx={{
                          id: String(tx._id),
                          kind: tx.kind,
                          status: tx.status,
                          editable,
                          payable,
                          recurring: !!tx.recurrenceId,
                          installmentGroup: !!(tx.creditCardId && (tx.installment?.total ?? 0) > 1),
                          form: {
                            id: String(tx._id),
                            kind: tx.kind as "income" | "expense" | "transfer",
                            description: tx.description,
                            amount: tx.amount,
                            date: toISODate(new Date(tx.date)),
                            dueDate: tx.dueDate ? toISODate(new Date(tx.dueDate)) : "",
                            status: tx.status === "pending" ? "pending" : "paid",
                            categoryId: cat ? String(cat._id) : "",
                            accountId: acc ? String(acc._id) : "",
                            toAccountId: to ? String(to._id) : "",
                            paymentMethod: tx.paymentMethod ?? "pix",
                            nature: tx.nature ?? "variable",
                            notes: tx.notes ?? "",
                            creditCardId: cardRecurring ? String(card?._id) : undefined,
                          },
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      <Pagination page={res.page} pages={res.pages} hrefFor={pageHref} />
    </div>
  );
}
