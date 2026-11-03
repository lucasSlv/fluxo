"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { SegTabs } from "@/components/ui/tabs";
import { useAction } from "@/hooks/use-action";
import { addContributionAction, deleteGoalAction, removeContributionAction } from "@/modules/goals/actions";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";

export function DeleteGoalButton({ id }: { id: string }) {
  return (
    <ConfirmButton action={() => deleteGoalAction(id)} title="Excluir objetivo?" description="O objetivo e seus aportes manuais serão removidos. Caixinhas vinculadas não são afetadas." confirmLabel="Excluir" success="Objetivo excluído">
      <Trash2 size={14} />
    </ConfirmButton>
  );
}

export function ContributionsButton({ goalId, current, contributions }: { goalId: string; current: number; contributions: { _id: string; amount: number; date: string; note: string }[] }) {
  const [open, setOpen] = useState(false);
  const [dir, setDir] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const add = useAction(addContributionAction, {
    success: "Aporte registrado",
    onSuccess: () => {
      setAmount(null);
      setNote("");
    },
  });
  const remove = useAction((cid: string) => removeContributionAction(goalId, cid), { success: "Aporte removido" });
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Aportar
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Aportes" description={`Acumulado: ${formatMoney(current)}`}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            add.run({ goalId, amount: (amount ?? 0) * (dir === "out" ? -1 : 1), date, note });
          }}
        >
          <SegTabs<"in" | "out"> value={dir} onChange={setDir} items={[{ value: "in", label: "Adicionar" }, { value: "out", label: "Retirar" }]} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor" error={add.fieldErrors.amount}>
              <MoneyInput value={amount} onChange={setAmount} invalid={!!add.fieldErrors.amount} />
            </Field>
            <Field label="Data">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Observação" className="sm:col-span-2">
              <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={add.pending}>
              Registrar
            </Button>
          </div>
        </form>
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold text-ink-3">Histórico</p>
          {contributions.length ? (
            <ul className="divide-y divide-line text-sm">
              {[...contributions].reverse().map((c) => (
                <li key={c._id} className="flex items-center gap-3 py-2">
                  <span className="w-20 text-xs tabular text-ink-3">{formatDate(c.date)}</span>
                  <span className="flex-1 truncate text-ink-2">{c.note || (c.amount > 0 ? "Aporte" : "Retirada")}</span>
                  <span className={c.amount > 0 ? "font-semibold tabular text-pos" : "font-semibold tabular text-neg"}>{formatMoney(c.amount, "BRL", { sign: true })}</span>
                  <button className="rounded-full p-1 text-ink-3 hover:bg-muted hover:text-neg" aria-label="Remover aporte" disabled={remove.pending} onClick={() => remove.run(c._id)}>
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Nenhum aporte ainda.</p>
          )}
        </div>
      </Modal>
    </>
  );
}
