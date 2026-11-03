import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { listBoxes } from "@/modules/savings/service";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty";
import { IconTile } from "@/components/ui/icon";
import { Stat } from "@/components/ui/stat";
import { BoxFormButton, MoveBoxButton } from "./_components/box-forms";

export const metadata = { title: "Caixinhas" };

export default async function SavingsPage() {
  const user = await requireUser();
  const boxes = await listBoxes(user.id);
  const cur = user.preferences.currency;
  const total = boxes.reduce((s, b) => s + b.balance, 0);
  const targets = boxes.reduce((s, b) => s + (b.target ?? 0), 0);

  return (
    <>
      <PageHeader title="Caixinhas" description="Reservas separadas por finalidade. Guardar e resgatar são transferências, não receitas ou despesas." actions={<BoxFormButton />} />
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Total reservado" value={formatMoney(total, cur)} tone="pos" />
        <Stat label="Soma das metas" value={targets ? formatMoney(targets, cur) : "—"} hint={targets ? `${Math.round((total / targets) * 100)}% alcançado` : undefined} />
        <Stat label="Caixinhas" value={boxes.length} className="col-span-2 lg:col-span-1" />
      </section>
      {boxes.length === 0 ? (
        <EmptyState icon={<PiggyBank size={20} />} title="Nenhuma caixinha" description="Crie caixinhas como Reserva de emergência, Viagem ou Novo computador e acompanhe cada uma separadamente." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {boxes.map((b) => (
            <article key={b.id} className="flex flex-col rounded-2xl bg-muted p-5">
              <Link href={`/savings/${b.id}`} className="mb-4 flex items-center gap-3">
                <IconTile name={b.icon} color={b.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{b.name}</p>
                  <p className="text-xs text-ink-3">{b.target ? `Meta ${formatMoney(b.target, cur)}` : "Sem meta"}</p>
                </div>
              </Link>
              <p className="mb-3 text-2xl font-extrabold tracking-tight tabular">{formatMoney(b.balance, cur)}</p>
              {b.progress != null && (
                <>
                  <Progress value={b.progress} tone={b.progress >= 100 ? "bg-pos" : "bg-ink"} />
                  <p className="mt-1.5 text-xs text-ink-3">
                    {Math.round(b.progress)}% · faltam {formatMoney(Math.max(0, (b.target ?? 0) - b.balance), cur)}
                  </p>
                </>
              )}
              <div className="mt-auto flex justify-end gap-2 pt-4">
                <Link href={`/savings/${b.id}`} className="inline-flex h-8 items-center rounded-lg bg-surface px-3 text-xs font-semibold hover:bg-neutral-200">
                  Histórico
                </Link>
                <MoveBoxButton boxId={b.id} boxName={b.name} balance={b.balance} />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
