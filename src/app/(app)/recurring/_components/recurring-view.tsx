"use client";

import Link from "next/link";
import { useState } from "react";
import { History, Pause, Pencil, Play, Plus, Repeat, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { SegTabs } from "@/components/ui/tabs";
import { Money } from "@/components/ui/money";
import { Row } from "@/components/finance/row";
import { AccountSelect, CategorySelect } from "@/components/finance/category-select";
import { useLookups } from "@/components/layout/lookups";
import { useAction } from "@/hooks/use-action";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { createRecurrenceAction, setRecurrenceStatusAction, updateRecurrenceAction } from "@/modules/recurring/actions";
import { FREQUENCY_LABEL } from "@/modules/recurring/rules";
import { PAYMENT_LABEL } from "@/modules/transactions/schemas";

export type RecurrenceItem = {
  id: string;
  kind: "income" | "expense";
  description: string;
  amount: number;
  categoryId: { _id: string; name: string; icon: string; color: string } | null;
  accountId: { _id: string; name: string } | null;
  paymentMethod: string | null;
  frequency: keyof typeof FREQUENCY_LABEL;
  startDate: string;
  endDate: string | null;
  dueDay: number;
  status: "active" | "paused" | "cancelled";
  notes: string;
  monthly: number;
  paidCount: number;
  pendingCount: number;
  next: string | null;
  lastPaid: string | null;
};

const STATUS = { active: { label: "Ativa", tone: "pos" }, paused: { label: "Pausada", tone: "warn" }, cancelled: { label: "Cancelada", tone: "neutral" } } as const;

type Form = {
  id?: string;
  kind: "income" | "expense";
  description: string;
  amount: number | null;
  categoryId: string;
  accountId: string;
  paymentMethod: string;
  frequency: RecurrenceItem["frequency"];
  startDate: string;
  endDate: string;
  dueDay: number;
  notes: string;
};

const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function RecurringView({ items, dateFormat }: { items: RecurrenceItem[]; dateFormat: "dd/MM/yyyy" | "yyyy-MM-dd" }) {
  const [form, setForm] = useState<Form | null>(null);
  const { accounts } = useLookups();
  const openNew = () =>
    setForm({ kind: "expense", description: "", amount: null, categoryId: "", accountId: accounts[0]?.id ?? "", paymentMethod: "boleto", frequency: "monthly", startDate: todayISO(), endDate: "", dueDay: new Date().getDate(), notes: "" });
  const openEdit = (r: RecurrenceItem) =>
    setForm({
      id: r.id,
      kind: r.kind,
      description: r.description,
      amount: r.amount,
      categoryId: r.categoryId?._id ?? "",
      accountId: r.accountId?._id ?? "",
      paymentMethod: r.paymentMethod ?? "other",
      frequency: r.frequency,
      startDate: r.startDate.slice(0, 10),
      endDate: r.endDate ? r.endDate.slice(0, 10) : "",
      dueDay: r.dueDay,
      notes: r.notes ?? "",
    });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openNew}>
          <Plus size={16} /> Nova recorrência
        </Button>
      </div>
      {items.length ? (
        <div className="space-y-2">
          {items.map((r) => (
            <Row
              key={r.id}
              icon={r.categoryId?.icon ?? "repeat"}
              color={r.categoryId?.color}
              className={r.status === "cancelled" ? "opacity-60" : undefined}
              title={
                <span className="flex items-center gap-2">
                  {r.description} <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                </span>
              }
              subtitle={`${FREQUENCY_LABEL[r.frequency]} · ${r.frequency === "weekly" ? "semanal" : `dia ${r.dueDay}`} · ${r.accountId?.name ?? "—"} · ${r.paidCount} paga(s), ${r.pendingCount} pendente(s)`}
              meta={
                <>
                  <span className="text-ink-3">{r.next ? `Próx.: ${formatDate(r.next, dateFormat)}` : "Sem próximas"}</span>
                  <span className="w-28 text-right">
                    <Money value={r.kind === "income" ? r.amount : -r.amount} colored />
                    <span className="block text-[10px] font-normal text-ink-3">{formatMoney(r.monthly)}/mês</span>
                  </span>
                </>
              }
              action={
                <div className="flex items-center">
                  <Link href={`/recurring/${r.id}`} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-muted" aria-label="Histórico" title="Histórico">
                    <History size={15} />
                  </Link>
                  {r.status !== "cancelled" && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Editar" title="Editar">
                        <Pencil size={14} />
                      </Button>
                      <StatusButtons r={r} />
                    </>
                  )}
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Repeat size={20} />} title="Nenhuma recorrência" description="Cadastre aluguel, internet, academia, salário… As ocorrências são geradas automaticamente." />
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar recorrência" : "Nova recorrência"} description={form?.id ? "As alterações valem para todas as próximas ocorrências pendentes. Pagas e editadas individualmente não mudam." : undefined} size="lg">
        {form && <RecurrenceForm initial={form} onDone={() => setForm(null)} />}
      </Modal>
    </>
  );
}

function StatusButtons({ r }: { r: RecurrenceItem }) {
  const toggle = useAction((s: "active" | "paused") => setRecurrenceStatusAction(r.id, s), { success: r.status === "active" ? "Recorrência pausada" : "Recorrência retomada" });
  return (
    <>
      <Button variant="ghost" size="icon" loading={toggle.pending} onClick={() => toggle.run(r.status === "active" ? "paused" : "active")} aria-label={r.status === "active" ? "Pausar" : "Retomar"} title={r.status === "active" ? "Pausar" : "Retomar"}>
        {!toggle.pending && (r.status === "active" ? <Pause size={14} /> : <Play size={14} />)}
      </Button>
      <ConfirmButton
        action={() => setRecurrenceStatusAction(r.id, "cancelled")}
        title="Cancelar recorrência?"
        description="As próximas ocorrências pendentes serão removidas. O histórico pago é mantido. Não é possível reativar."
        confirmLabel="Cancelar recorrência"
        success="Recorrência cancelada"
        size="icon"
      >
        <XCircle size={14} />
      </ConfirmButton>
    </>
  );
}

function RecurrenceForm({ initial, onDone }: { initial: Form; onDone: () => void }) {
  const [v, setV] = useState(initial);
  const set = <K extends keyof Form>(k: K, val: Form[K]) => setV((s) => ({ ...s, [k]: val }));
  const save = useAction<Form, unknown>(
    (f) => {
      const input = {
        kind: f.kind,
        description: f.description,
        amount: f.amount ?? 0,
        categoryId: f.categoryId,
        accountId: f.accountId,
        paymentMethod: f.paymentMethod as never,
        frequency: f.frequency,
        startDate: f.startDate,
        endDate: f.endDate || null,
        dueDay: f.dueDay,
        notes: f.notes,
      };
      return f.id ? updateRecurrenceAction(f.id, input) : createRecurrenceAction(input);
    },
    { success: initial.id ? "Recorrência atualizada" : "Recorrência criada", onSuccess: onDone },
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
      {!initial.id && (
        <SegTabs
          value={v.kind}
          onChange={(k) => setV((s) => ({ ...s, kind: k, categoryId: "" }))}
          items={[
            { value: "expense", label: "Despesa" },
            { value: "income", label: "Receita" },
          ]}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Descrição" error={err.description} className="sm:col-span-2">
          <Input value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Ex.: Aluguel" invalid={!!err.description} autoFocus maxLength={140} />
        </Field>
        <Field label="Valor" error={err.amount}>
          <MoneyInput value={v.amount} onChange={(c) => set("amount", c)} invalid={!!err.amount} />
        </Field>
        <Field label="Categoria" error={err.categoryId}>
          <CategorySelect kind={v.kind} value={v.categoryId} onChange={(c) => set("categoryId", c)} invalid={!!err.categoryId} />
        </Field>
        <Field label="Conta" error={err.accountId}>
          <AccountSelect value={v.accountId} onChange={(a) => set("accountId", a)} invalid={!!err.accountId} />
        </Field>
        <Field label="Forma de pagamento">
          <Select value={v.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
            {Object.entries(PAYMENT_LABEL)
              .filter(([k]) => k !== "credit")
              .map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Periodicidade" error={err.frequency}>
          <Select value={v.frequency} onChange={(e) => set("frequency", e.target.value as Form["frequency"])}>
            {Object.entries(FREQUENCY_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Dia de vencimento" error={err.dueDay} hint={v.frequency === "weekly" ? "Semanal: repete a cada 7 dias a partir da data inicial" : "Em meses curtos, usa o último dia"}>
          <Input type="number" min={1} max={31} value={v.dueDay} onChange={(e) => set("dueDay", Number(e.target.value))} disabled={v.frequency === "weekly"} invalid={!!err.dueDay} />
        </Field>
        <Field label="Data inicial" error={err.startDate}>
          <Input type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} invalid={!!err.startDate} />
        </Field>
        <Field label="Data final (opcional)" error={err.endDate}>
          <Input type="date" value={v.endDate} onChange={(e) => set("endDate", e.target.value)} invalid={!!err.endDate} />
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <Textarea value={v.notes} onChange={(e) => set("notes", e.target.value)} rows={2} maxLength={500} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.pending}>
          {initial.id ? "Aplicar às próximas" : "Criar recorrência"}
        </Button>
      </div>
    </form>
  );
}
