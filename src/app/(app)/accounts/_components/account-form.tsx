"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { useAction } from "@/hooks/use-action";
import { createAccountAction, updateAccountAction } from "@/modules/accounts/actions";
import { ACCOUNT_TYPE_LABEL } from "@/modules/accounts/schemas";
import { cn } from "@/lib/utils";

export const SWATCHES = ["#111111", "#4f46e5", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0d9488", "#0284c7", "#64748b"];

export function ColorSwatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SWATCHES.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} aria-label={`Cor ${c}`} className={cn("h-7 w-7 rounded-full ring-offset-2 transition", value === c && "ring-2 ring-ink")} style={{ background: c }} />
      ))}
    </div>
  );
}

type Value = { name: string; type: string; institution: string; initialBalance: number | null; color: string };

export function AccountFormButton({ id, initial }: { id?: string; initial?: Value }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Value>(initial ?? { name: "", type: "checking", institution: "", initialBalance: 0, color: "#111111" });
  const [negative, setNegative] = useState((initial?.initialBalance ?? 0) < 0);
  const { run, pending, fieldErrors: e } = useAction<Value, unknown>(
    (val) => {
      const payload = { ...val, type: val.type as never, initialBalance: Math.abs(val.initialBalance ?? 0) * (negative ? -1 : 1) };
      return id ? updateAccountAction(id, payload) : createAccountAction(payload);
    },
    { success: id ? "Conta atualizada" : "Conta criada", onSuccess: () => setOpen(false) },
  );
  return (
    <>
      {id ? (
        <Button size="icon" variant="ghost" onClick={() => setOpen(true)} aria-label="Editar conta">
          <Pencil size={15} />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} strokeWidth={2.5} /> Nova conta
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={id ? "Editar conta" : "Nova conta"} description="O saldo atual é sempre calculado: saldo inicial + movimentações efetivadas.">
        <form
          className="space-y-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            run(v);
          }}
        >
          <Field label="Nome" error={e.name}>
            <Input value={v.name} onChange={(x) => setV({ ...v, name: x.target.value })} placeholder="Ex.: Nubank" autoFocus invalid={!!e.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo">
              <Select value={v.type} onChange={(x) => setV({ ...v, type: x.target.value })}>
                {Object.entries(ACCOUNT_TYPE_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Instituição (opcional)">
              <Input value={v.institution} onChange={(x) => setV({ ...v, institution: x.target.value })} />
            </Field>
          </div>
          <Field label="Saldo inicial" error={e.initialBalance} hint="Use o saldo na data em que você começa a registrar as movimentações.">
            <div className="flex gap-2">
              <MoneyInput value={v.initialBalance == null ? null : Math.abs(v.initialBalance)} onChange={(c) => setV({ ...v, initialBalance: c })} className="flex-1" />
              <Button variant={negative ? "danger" : "secondary"} onClick={() => setNegative((n) => !n)} title="Saldo negativo">
                {negative ? "Negativo" : "Positivo"}
              </Button>
            </div>
          </Field>
          <Field label="Cor">
            <ColorSwatches value={v.color} onChange={(c) => setV({ ...v, color: c })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
