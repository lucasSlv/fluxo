"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { AccountSelect } from "@/components/finance/category-select";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";
import { createCardAction, updateCardAction } from "@/modules/credit-cards/actions";

const COLORS = ["#0b0b0b", "#3f3f46", "#820ad1", "#ec7000", "#cc092f", "#0047bb", "#00a868", "#ff7a00", "#1e3a8a", "#be185d"];

export type CardFormValue = { id?: string; name: string; institution: string; limit: number | null; closingDay: number; dueDay: number; color: string; defaultAccountId: string };

export function CardForm({ initial, onDone }: { initial: CardFormValue; onDone: () => void }) {
  const [v, setV] = useState(initial);
  const set = <K extends keyof CardFormValue>(k: K, val: CardFormValue[K]) => setV((s) => ({ ...s, [k]: val }));
  const save = useAction<CardFormValue, unknown>(
    (f) => {
      const input = { name: f.name, institution: f.institution, limit: f.limit ?? 0, closingDay: f.closingDay, dueDay: f.dueDay, color: f.color, defaultAccountId: f.defaultAccountId || null };
      return f.id ? updateCardAction(f.id, input) : createCardAction(input);
    },
    { success: "Cartão salvo", onSuccess: onDone },
  );
  const err = save.fieldErrors;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.run(v);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do cartão" error={err.name}>
          <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Visa Platinum" autoFocus invalid={!!err.name} maxLength={60} />
        </Field>
        <Field label="Instituição" error={err.institution}>
          <Input value={v.institution} onChange={(e) => set("institution", e.target.value)} placeholder="Ex.: Banco X" maxLength={60} />
        </Field>
        <Field label="Limite total" error={err.limit}>
          <MoneyInput value={v.limit} onChange={(c) => set("limit", c)} invalid={!!err.limit} />
        </Field>
        <Field label="Conta padrão para pagar a fatura">
          <AccountSelect value={v.defaultAccountId} onChange={(a) => set("defaultAccountId", a)} placeholder="Nenhuma" />
        </Field>
        <Field label="Dia de fechamento" error={err.closingDay} hint="Compras a partir deste dia vão para a próxima fatura">
          <Input type="number" min={1} max={31} value={v.closingDay} onChange={(e) => set("closingDay", Number(e.target.value))} invalid={!!err.closingDay} />
        </Field>
        <Field label="Dia de vencimento" error={err.dueDay}>
          <Input type="number" min={1} max={31} value={v.dueDay} onChange={(e) => set("dueDay", Number(e.target.value))} invalid={!!err.dueDay} />
        </Field>
      </div>
      <Field label="Cor">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button type="button" key={c} onClick={() => set("color", c)} className={cn("h-7 w-7 rounded-full ring-offset-2", v.color === c && "ring-2 ring-ink")} style={{ background: c }} aria-label={c} />
          ))}
        </div>
      </Field>
      {v.id && <p className="text-xs text-ink-3">Alterar os dias de fechamento/vencimento vale para compras futuras; compras já lançadas mantêm sua fatura.</p>}
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
