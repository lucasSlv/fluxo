"use client";

import { useState } from "react";
import { Copy, Gauge, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty";
import { Field } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { CategorySelect } from "@/components/finance/category-select";
import { useAction } from "@/hooks/use-action";
import { formatMoney } from "@/lib/money";
import { monthLabel } from "@/lib/dates";
import { copyBudgetsAction, deleteBudgetAction, setBudgetAction } from "@/modules/budgets/actions";
import type { BudgetRow } from "@/modules/budgets/service";
import type { CategoryNode } from "@/modules/categories/service";

function thresholdTone(t: number): Tone {
  if (t >= 100) return "neg";
  if (t >= 90) return "neg";
  if (t >= 75) return "warn";
  return "info";
}

export function BudgetsView({ month, thresholds, budgets, withoutLimit }: { month: string; thresholds: number[]; budgets: BudgetRow[]; withoutLimit: CategoryNode[] }) {
  const [edit, setEdit] = useState<{ categoryId: string; limit: number | null; locked: boolean } | null>(null);
  const toast = useToast();
  const copy = useAction(() => copyBudgetsAction(month), {
    onSuccess: (n) => toast(n ? `${n} limite(s) copiado(s) do mês anterior` : "Nada para copiar — limites já existem ou o mês anterior está vazio"),
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" loading={copy.pending} onClick={() => copy.run(undefined as never)}>
          <Copy size={15} /> Copiar do mês anterior
        </Button>
        <Button onClick={() => setEdit({ categoryId: "", limit: null, locked: false })}>
          <Plus size={16} /> Definir limite
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {budgets.length ? (
            budgets.map((b) => (
              <Card key={b.id} className="p-4">
                <div className="flex items-center gap-3">
                  <IconTile name={b.icon} color={b.color} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold">{b.name}</p>
                      {b.threshold != null && <Badge tone={thresholdTone(b.threshold)}>{b.pct >= 100 ? (b.pct > 100 ? "Ultrapassado" : "100% atingido") : `${b.threshold}% atingido`}</Badge>}
                    </div>
                    <p className="text-xs text-ink-3 tabular">
                      {formatMoney(b.spent)} de {formatMoney(b.limit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-extrabold tabular ${b.available < 0 ? "text-neg" : ""}`}>{b.available < 0 ? `-${formatMoney(-b.available)}` : formatMoney(b.available)}</p>
                    <p className="text-[11px] text-ink-3">{b.available < 0 ? "acima do limite" : "disponível"}</p>
                  </div>
                  <div className="flex">
                    <Button variant="ghost" size="icon" aria-label="Editar limite" onClick={() => setEdit({ categoryId: b.categoryId, limit: b.limit, locked: true })}>
                      <Pencil size={14} />
                    </Button>
                    <ConfirmButton action={() => deleteBudgetAction(b.id)} title={`Remover limite de ${b.name}?`} description={`Apenas o limite de ${monthLabel(month, true)} será removido.`} confirmLabel="Remover" success="Limite removido" size="icon">
                      <Trash2 size={14} />
                    </ConfirmButton>
                  </div>
                </div>
                <div className="relative mt-3">
                  <Progress value={b.pct} />
                  {thresholds
                    .filter((t) => t < 100)
                    .map((t) => (
                      <span key={t} className="absolute top-0 h-2.5 w-px bg-white/90" style={{ left: `${t}%` }} aria-hidden />
                    ))}
                </div>
                <p className="mt-1.5 text-right text-[11px] font-semibold text-ink-3 tabular">{Math.round(b.pct)}% utilizado</p>
              </Card>
            ))
          ) : (
            <EmptyState icon={<Gauge size={20} />} title={`Nenhum limite em ${monthLabel(month, true)}`} description="Defina limites por categoria ou copie os do mês anterior." />
          )}
        </div>

        <Card className="h-fit">
          <CardTitle>Sem limite neste mês</CardTitle>
          {withoutLimit.length ? (
            <ul className="space-y-1">
              {withoutLimit.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setEdit({ categoryId: c.id, limit: null, locked: true })} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm hover:bg-surface">
                    <IconTile name={c.icon} color={c.color} size={30} />
                    <span className="flex-1 truncate font-medium">{c.name}</span>
                    <Plus size={14} className="text-ink-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Todas as categorias de despesa têm limite.</p>
          )}
        </Card>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Limite mensal" description={`Vale somente para ${monthLabel(month, true)}.`} size="sm">
        {edit && <BudgetForm month={month} initial={edit} onDone={() => setEdit(null)} />}
      </Modal>
    </>
  );
}

function BudgetForm({ month, initial, onDone }: { month: string; initial: { categoryId: string; limit: number | null; locked: boolean }; onDone: () => void }) {
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [limit, setLimit] = useState<number | null>(initial.limit);
  const save = useAction(setBudgetAction, { success: "Limite salvo", onSuccess: onDone });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.run({ categoryId, month, limit: limit ?? 0 });
      }}
    >
      <Field label="Categoria" error={save.fieldErrors.categoryId}>
        {initial.locked ? <CategorySelect kind="expense" onlyRoots value={categoryId} onChange={() => {}} /> : <CategorySelect kind="expense" onlyRoots value={categoryId} onChange={setCategoryId} invalid={!!save.fieldErrors.categoryId} />}
      </Field>
      <Field label="Limite" error={save.fieldErrors.limit}>
        <MoneyInput value={limit} onChange={setLimit} autoFocus invalid={!!save.fieldErrors.limit} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.pending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
