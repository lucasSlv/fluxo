import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { boxHistory, listBoxes } from "@/modules/savings/service";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Stat } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty";
import { BoxFormButton, DeleteBoxButton, MoveBoxButton, UndoMoveButton } from "../_components/box-forms";

export const metadata = { title: "Caixinha" };

export default async function SavingsBoxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const box = (await listBoxes(user.id, { includeArchived: true })).find((b) => b.id === id);
  if (!box) notFound();
  const history = await boxHistory(user.id, id);
  const fmt = user.preferences.dateFormat;
  const cur = user.preferences.currency;
  const deposits = history.filter((h) => h.kind === "savings_deposit").reduce((s, h) => s + h.amount, 0);
  const withdrawals = history.filter((h) => h.kind === "savings_withdrawal").reduce((s, h) => s + h.amount, 0);

  return (
    <>
      <Link href="/savings" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-ink">
        <ArrowLeft size={14} /> Caixinhas
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{box.name}</h1>
          <p className="mt-1 text-sm text-ink-3">{box.archived ? "Arquivada" : box.target ? `Meta de ${formatMoney(box.target, cur)}` : "Sem meta definida"}</p>
        </div>
        <div className="flex items-center gap-2">
          {!box.archived && <MoveBoxButton boxId={id} boxName={box.name} balance={box.balance} size="md" />}
          <BoxFormButton initial={{ id, name: box.name, target: box.target ?? null, color: box.color ?? "#111111", icon: box.icon ?? "piggy-bank" }} />
          <DeleteBoxButton id={id} redirectTo="/savings" />
        </div>
      </div>
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Saldo" value={formatMoney(box.balance, cur)} tone="pos" />
        <Stat label="Total guardado" value={formatMoney(deposits, cur)} />
        <Stat label="Total resgatado" value={formatMoney(withdrawals, cur)} />
        <Stat label="Progresso" value={box.progress != null ? `${Math.round(box.progress)}%` : "—"} hint={box.progress != null ? <Progress value={box.progress} size="sm" tone="bg-pos" /> : undefined} />
      </section>
      <Card>
        <CardTitle>Movimentações</CardTitle>
        {history.length ? (
          <ul className="divide-y divide-line">
            {history.map((h) => {
              const dep = h.kind === "savings_deposit";
              const acc = h.accountId as unknown as { name: string } | null;
              return (
                <li key={String(h._id)} className="flex items-center gap-3 py-3 text-sm">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface ${dep ? "text-pos" : "text-ink-2"}`}>{dep ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{h.description}</p>
                    <p className="text-xs text-ink-3">
                      {formatDate(h.date, fmt)} · {dep ? "de" : "para"} {acc?.name ?? "conta"}
                    </p>
                  </div>
                  <span className={`font-bold tabular ${dep ? "text-pos" : "text-ink-2"}`}>{formatMoney(dep ? h.amount : -h.amount, cur, { sign: true })}</span>
                  <UndoMoveButton txId={String(h._id)} />
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Nenhuma movimentação" description="Use “Movimentar” para guardar dinheiro nesta caixinha." />
        )}
      </Card>
    </>
  );
}
