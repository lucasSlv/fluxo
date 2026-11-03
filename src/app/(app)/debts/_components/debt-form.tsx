"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { AccountSelect, CategorySelect } from "@/components/finance/category-select";
import { useLookups } from "@/components/layout/lookups";
import { useAction } from "@/hooks/use-action";
import { createDebtAction, updateDebtAction } from "@/modules/debts/actions";
import { DEBT_KIND_LABEL } from "@/modules/debts/schemas";
import { formatMoney } from "@/lib/money";

const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function NewDebtButton() {
  const [open, setOpen] = useState(false);
  const { accounts } = useLookups();
  const [v, setV] = useState({
    name: "",
    creditor: "",
    kind: "loan",
    installmentsCount: "12",
    installmentAmount: null as number | null,
    paidBefore: "0",
    interestRate: "",
    contractDate: todayISO(),
    firstDueDate: todayISO(),
    accountId: "",
    categoryId: "",
    notes: "",
  });
  const set = (k: keyof typeof v, val: unknown) => setV((s) => ({ ...s, [k]: val }));
  const { run, pending, fieldErrors: err } = useAction(createDebtAction, { success: "Dívida cadastrada", onSuccess: () => setOpen(false) });
  const total = (v.installmentAmount ?? 0) * (Number(v.installmentsCount) || 0);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} strokeWidth={2.5} /> Nova dívida
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova dívida" description="As parcelas restantes viram despesas pendentes, uma por mês." size="lg">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run({
              name: v.name,
              creditor: v.creditor,
              kind: v.kind as never,
              installmentsCount: Number(v.installmentsCount),
              installmentAmount: v.installmentAmount ?? 0,
              paidBefore: Number(v.paidBefore) || 0,
              interestRate: v.interestRate ? Number(v.interestRate.replace(",", ".")) : null,
              contractDate: v.contractDate,
              firstDueDate: v.firstDueDate,
              accountId: v.accountId || accounts[0]?.id || "",
              categoryId: v.categoryId,
              notes: v.notes,
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" error={err.name} className="sm:col-span-2">
              <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Financiamento do carro" autoFocus invalid={!!err.name} />
            </Field>
            <Field label="Credor" error={err.creditor}>
              <Input value={v.creditor} onChange={(e) => set("creditor", e.target.value)} placeholder="Ex.: Banco X" />
            </Field>
            <Field label="Tipo">
              <Select value={v.kind} onChange={(e) => set("kind", e.target.value)}>
                {Object.entries(DEBT_KIND_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantidade de parcelas" error={err.installmentsCount}>
              <Input type="number" min={1} max={600} value={v.installmentsCount} onChange={(e) => set("installmentsCount", e.target.value)} invalid={!!err.installmentsCount} />
            </Field>
            <Field label="Valor da parcela" error={err.installmentAmount} hint={total ? `Total: ${formatMoney(total)}` : undefined}>
              <MoneyInput value={v.installmentAmount} onChange={(c) => set("installmentAmount", c)} invalid={!!err.installmentAmount} />
            </Field>
            <Field label="Parcelas já pagas" error={err.paidBefore} hint="Pagas antes do cadastro (não alteram saldos)">
              <Input type="number" min={0} value={v.paidBefore} onChange={(e) => set("paidBefore", e.target.value)} invalid={!!err.paidBefore} />
            </Field>
            <Field label="Juros (% ao mês, opcional)" error={err.interestRate}>
              <Input inputMode="decimal" value={v.interestRate} onChange={(e) => set("interestRate", e.target.value)} placeholder="Ex.: 1,99" />
            </Field>
            <Field label="Data de contratação" error={err.contractDate}>
              <Input type="date" value={v.contractDate} onChange={(e) => set("contractDate", e.target.value)} />
            </Field>
            <Field label="Vencimento da 1ª parcela" error={err.firstDueDate}>
              <Input type="date" value={v.firstDueDate} onChange={(e) => set("firstDueDate", e.target.value)} />
            </Field>
            <Field label="Conta de pagamento" error={err.accountId}>
              <AccountSelect value={v.accountId || accounts[0]?.id || ""} onChange={(a) => set("accountId", a)} invalid={!!err.accountId} />
            </Field>
            <Field label="Categoria (opcional)" error={err.categoryId} hint="Padrão: Dívidas">
              <CategorySelect kind="expense" value={v.categoryId} onChange={(c) => set("categoryId", c)} placeholder="Dívidas" />
            </Field>
            <Field label="Observações" className="sm:col-span-2">
              <Textarea rows={2} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              Cadastrar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function EditDebtButton({ debt }: { debt: { id: string; name: string; creditor: string; kind: string; interestRate: number | null; accountId: string; notes: string } }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ ...debt, interestRate: debt.interestRate != null ? String(debt.interestRate).replace(".", ",") : "" });
  const set = (k: keyof typeof v, val: unknown) => setV((s) => ({ ...s, [k]: val }));
  const { run, pending, fieldErrors: err } = useAction((input: Parameters<typeof updateDebtAction>[1]) => updateDebtAction(debt.id, input), {
    success: "Dívida atualizada",
    onSuccess: () => setOpen(false),
  });
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="Editar">
        <Pencil size={14} /> Editar
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar dívida" description="Valores e parcelas não mudam; use amortização para abater o saldo.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run({ name: v.name, creditor: v.creditor, kind: v.kind as never, interestRate: v.interestRate ? Number(v.interestRate.replace(",", ".")) : null, accountId: v.accountId, notes: v.notes });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" error={err.name} className="sm:col-span-2">
              <Input value={v.name} onChange={(e) => set("name", e.target.value)} invalid={!!err.name} />
            </Field>
            <Field label="Credor">
              <Input value={v.creditor} onChange={(e) => set("creditor", e.target.value)} />
            </Field>
            <Field label="Tipo">
              <Select value={v.kind} onChange={(e) => set("kind", e.target.value)}>
                {Object.entries(DEBT_KIND_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Juros (% ao mês)" error={err.interestRate}>
              <Input inputMode="decimal" value={v.interestRate} onChange={(e) => set("interestRate", e.target.value)} />
            </Field>
            <Field label="Conta de pagamento" error={err.accountId} hint="Aplica-se às parcelas pendentes">
              <AccountSelect value={v.accountId} onChange={(a) => set("accountId", a)} />
            </Field>
            <Field label="Observações" className="sm:col-span-2">
              <Textarea rows={2} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
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
