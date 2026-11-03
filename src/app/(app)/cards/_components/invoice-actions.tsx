"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { AccountSelect, CategorySelect } from "@/components/finance/category-select";
import { useLookups } from "@/components/layout/lookups";
import { useAction } from "@/hooks/use-action";
import { formatMoney } from "@/lib/money";
import { monthLabel } from "@/lib/dates";
import { createPurchaseAction, payInvoiceAction } from "@/modules/credit-cards/actions";

const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function InvoiceActions({ cardId, invoiceMonth, remaining, defaultAccountId, canPay }: { cardId: string; invoiceMonth: string; remaining: number; defaultAccountId: string; canPay: boolean }) {
  const [open, setOpen] = useState<"pay" | "buy" | null>(null);
  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => setOpen("buy")}>
        <Plus size={15} /> Nova compra
      </Button>
      {canPay && (
        <Button onClick={() => setOpen("pay")}>
          <Wallet size={15} /> Pagar fatura
        </Button>
      )}
      <Modal open={open === "pay"} onClose={() => setOpen(null)} title={`Pagar fatura de ${monthLabel(invoiceMonth, true)}`} description={`Restante: ${formatMoney(remaining)}. Pagamentos parciais são permitidos.`} size="sm">
        {open === "pay" && <PayForm cardId={cardId} invoiceMonth={invoiceMonth} remaining={remaining} defaultAccountId={defaultAccountId} onDone={() => setOpen(null)} />}
      </Modal>
      <Modal open={open === "buy"} onClose={() => setOpen(null)} title="Nova compra no cartão" size="lg">
        {open === "buy" && <PurchaseForm cardId={cardId} onDone={() => setOpen(null)} />}
      </Modal>
    </div>
  );
}

function PayForm({ cardId, invoiceMonth, remaining, defaultAccountId, onDone }: { cardId: string; invoiceMonth: string; remaining: number; defaultAccountId: string; onDone: () => void }) {
  const { accounts } = useLookups();
  const [accountId, setAccountId] = useState(defaultAccountId || accounts[0]?.id || "");
  const [amount, setAmount] = useState<number | null>(remaining);
  const [date, setDate] = useState(todayISO());
  const pay = useAction(payInvoiceAction, { success: "Pagamento registrado", onSuccess: onDone });
  const err = pay.fieldErrors;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        pay.run({ cardId, invoiceMonth, accountId, amount: amount ?? 0, date });
      }}
    >
      <Field label="Conta de pagamento" error={err.accountId}>
        <AccountSelect value={accountId} onChange={setAccountId} invalid={!!err.accountId} />
      </Field>
      <Field label="Valor" error={err.amount}>
        <MoneyInput value={amount} onChange={setAmount} invalid={!!err.amount} />
      </Field>
      <Field label="Data do pagamento" error={err.date}>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={pay.pending}>
          Confirmar pagamento
        </Button>
      </div>
    </form>
  );
}

function PurchaseForm({ cardId, onDone }: { cardId: string; onDone: () => void }) {
  const [v, setV] = useState({ description: "", amount: null as number | null, date: todayISO(), installments: 1, categoryId: "", nature: "variable" as "fixed" | "variable", notes: "" });
  const buy = useAction(createPurchaseAction, { success: "Compra registrada", onSuccess: onDone });
  const err = buy.fieldErrors;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        buy.run({ cardId, ...v, amount: v.amount ?? 0 });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Descrição" error={err.description} className="sm:col-span-2">
          <Input value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} autoFocus invalid={!!err.description} maxLength={140} />
        </Field>
        <Field label="Valor total" error={err.amount}>
          <MoneyInput value={v.amount} onChange={(a) => setV({ ...v, amount: a })} invalid={!!err.amount} />
        </Field>
        <Field label="Data da compra" error={err.date}>
          <Input type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
        </Field>
        <Field label="Parcelas" error={err.installments} hint={v.installments > 1 && v.amount ? `${v.installments}× de ${formatMoney(Math.floor(v.amount / v.installments))}` : undefined}>
          <Select value={v.installments} onChange={(e) => setV({ ...v, installments: Number(e.target.value) })}>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "À vista" : `${n}×`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Categoria" error={err.categoryId}>
          <CategorySelect kind="expense" value={v.categoryId} onChange={(c) => setV({ ...v, categoryId: c })} invalid={!!err.categoryId} />
        </Field>
        <Field label="Natureza">
          <Select value={v.nature} onChange={(e) => setV({ ...v, nature: e.target.value as "fixed" | "variable" })}>
            <option value="variable">Variável</option>
            <option value="fixed">Fixa</option>
          </Select>
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <Textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} rows={2} maxLength={1000} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={buy.pending}>
          Registrar compra
        </Button>
      </div>
    </form>
  );
}
