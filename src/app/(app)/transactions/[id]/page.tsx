import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { getTransaction, transactionHistory } from "@/modules/transactions/service";
import { KIND_LABEL, PAYMENT_LABEL } from "@/modules/transactions/schemas";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttachmentUploader, DeleteAttachment } from "./uploader";

export const metadata = { title: "Movimentação" };

const ACTION_LABEL: Record<string, string> = { create: "Criada", update: "Editada", delete: "Excluída", status: "Status alterado" };
const FIELD_LABEL: Record<string, string> = { amount: "Valor", description: "Descrição", date: "Data", dueDate: "Vencimento", status: "Status", categoryId: "Categoria", accountId: "Conta", nature: "Natureza" };

export default async function TransactionDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [tx, history] = await Promise.all([getTransaction(user.id, id), transactionHistory(user.id, id)]);
  const cat = tx.categoryId as unknown as { name: string } | null;
  const fmt = user.preferences.dateFormat;
  const rows: [string, React.ReactNode][] = [
    ["Tipo", KIND_LABEL[tx.kind]],
    ["Valor", <span key="v" className="font-bold tabular">{formatMoney(tx.amount, user.preferences.currency)}</span>],
    ["Data", formatDate(tx.date, fmt)],
    ["Vencimento", formatDate(tx.dueDate, fmt)],
    ["Status", tx.status === "paid" ? "Efetivada" : tx.status === "pending" ? "Pendente" : "Cancelada"],
    ["Pago em", tx.paidAt ? formatDate(tx.paidAt, fmt) : "—"],
    ["Categoria", cat?.name ?? "—"],
    ["Forma de pagamento", tx.paymentMethod ? PAYMENT_LABEL[tx.paymentMethod] : "—"],
    ["Natureza", tx.nature === "fixed" ? "Fixa" : "Variável"],
    ["Parcela", tx.installment?.total ? `${tx.installment.number}/${tx.installment.total}` : "—"],
    ["Observações", tx.notes || "—"],
  ];
  const fmtVal = (k: string, v: unknown) => (v == null ? "—" : k === "amount" ? formatMoney(Number(v)) : v instanceof Date || (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) ? formatDate(v as string, fmt) : String(v));

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/transactions" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-3 hover:text-ink">
        <ArrowLeft size={15} /> Movimentações
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{tx.description}</h1>
        {tx.recurrenceId && <Badge tone="info">Recorrente</Badge>}
        {tx.overridden && <Badge>Editada individualmente</Badge>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold text-ink-3">{k}</dt>
                <dd className="mt-0.5 text-sm">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <CardTitle>Comprovantes</CardTitle>
          <ul className="mb-3 space-y-2">
            {((tx.attachments ?? []) as { fileId: unknown; filename: string }[]).map((a) => (
              <li key={String(a.fileId)} className="flex items-center gap-2 rounded-xl bg-surface p-2.5 text-sm">
                <FileText size={15} className="shrink-0 text-ink-3" />
                <a href={`/api/attachments/${a.fileId}`} target="_blank" className="flex-1 truncate font-medium hover:underline">
                  {a.filename}
                </a>
                <DeleteAttachment transactionId={id} fileId={String(a.fileId)} />
              </li>
            ))}
            {!tx.attachments?.length && <li className="text-xs text-ink-3">Nenhum anexo.</li>}
          </ul>
          <AttachmentUploader transactionId={id} />
        </Card>
      </div>
      <Card className="mt-6">
        <CardTitle>Histórico de alterações</CardTitle>
        <ol className="space-y-3">
          {history.map((h) => {
            const after = (h.after ?? {}) as Record<string, unknown>;
            const before = (h.before ?? {}) as Record<string, unknown>;
            const changed = h.action === "create" ? [] : Object.keys(FIELD_LABEL).filter((k) => k in after && String(after[k]) !== String(before[k]));
            return (
              <li key={String(h._id)} className="rounded-xl bg-surface p-3 text-sm">
                <p className="font-semibold">
                  {ACTION_LABEL[h.action]} <span className="font-normal text-ink-3">· {new Date(h.createdAt as Date).toLocaleString("pt-BR", { timeZone: user.preferences.timezone })}</span>
                </p>
                {changed.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs text-ink-2">
                    {changed.map((k) => (
                      <li key={k}>
                        {FIELD_LABEL[k]}: <s className="text-ink-4">{fmtVal(k, before[k])}</s> → <b>{fmtVal(k, after[k])}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
          {!history.length && <li className="text-sm text-ink-3">Sem histórico.</li>}
        </ol>
      </Card>
    </div>
  );
}
