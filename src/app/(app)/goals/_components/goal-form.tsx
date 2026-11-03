"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { useLookups } from "@/components/layout/lookups";
import { useAction } from "@/hooks/use-action";
import type { ActionResult } from "@/lib/errors";
import { createGoalAction, updateGoalAction } from "@/modules/goals/actions";

const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export type GoalFormValue = {
  id?: string;
  name: string;
  description: string;
  target: number | null;
  startDate: string;
  targetDate: string;
  priority: "low" | "medium" | "high";
  category: string;
  status: "active" | "achieved" | "paused" | "cancelled";
  savingsBoxId: string;
};

export function GoalFormButton({ initial }: { initial?: GoalFormValue }) {
  const [open, setOpen] = useState(false);
  const { boxes } = useLookups();
  const blank: GoalFormValue = { name: "", description: "", target: null, startDate: todayISO(), targetDate: "", priority: "medium", category: "", status: "active", savingsBoxId: "" };
  const [v, setV] = useState<GoalFormValue>(initial ?? blank);
  const set = <K extends keyof GoalFormValue>(k: K, val: GoalFormValue[K]) => setV((s) => ({ ...s, [k]: val }));
  const editing = !!initial?.id;
  const { run, pending, fieldErrors: err } = useAction<GoalFormValue, unknown>(
    (input): Promise<ActionResult<unknown>> => {
      const payload = { ...input, target: input.target ?? 0 };
      delete (payload as { id?: string }).id;
      return editing ? updateGoalAction(initial!.id!, payload) : createGoalAction(payload);
    },
    {
      success: editing ? "Objetivo atualizado" : "Objetivo criado",
      onSuccess: () => {
        setOpen(false);
        if (!editing) setV(blank);
      },
    },
  );

  return (
    <>
      {editing ? (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil size={14} /> Editar
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} strokeWidth={2.5} /> Novo objetivo
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar objetivo" : "Novo objetivo"} size="lg">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(v);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" error={err.name} className="sm:col-span-2">
              <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Reserva de emergência" autoFocus invalid={!!err.name} />
            </Field>
            <Field label="Descrição" className="sm:col-span-2">
              <Textarea rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />
            </Field>
            <Field label="Valor desejado" error={err.target}>
              <MoneyInput value={v.target} onChange={(c) => set("target", c)} invalid={!!err.target} />
            </Field>
            <Field label="Categoria" hint="Ex.: Viagem, Veículo, Imóvel">
              <Input value={v.category} onChange={(e) => set("category", e.target.value)} maxLength={40} />
            </Field>
            <Field label="Data de início" error={err.startDate}>
              <Input type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
            <Field label="Conclusão prevista" error={err.targetDate}>
              <Input type="date" value={v.targetDate} onChange={(e) => set("targetDate", e.target.value)} />
            </Field>
            <Field label="Prioridade">
              <Select value={v.priority} onChange={(e) => set("priority", e.target.value as GoalFormValue["priority"])}>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={v.status} onChange={(e) => set("status", e.target.value as GoalFormValue["status"])}>
                <option value="active">Em andamento</option>
                <option value="paused">Pausado</option>
                <option value="achieved">Alcançado</option>
                <option value="cancelled">Cancelado</option>
              </Select>
            </Field>
            <Field label="Caixinha vinculada" className="sm:col-span-2" hint="Com caixinha, o acumulado é o saldo dela. Sem caixinha, registre aportes manualmente.">
              <Select value={v.savingsBoxId} onChange={(e) => set("savingsBoxId", e.target.value)}>
                <option value="">Sem caixinha (aportes manuais)</option>
                {boxes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? "Salvar" : "Criar objetivo"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
