"use client";

import Link from "next/link";
import { useState } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { SegTabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useLookups } from "@/components/layout/lookups";
import { useAction } from "@/hooks/use-action";
import type { ActionResult } from "@/lib/errors";
import { createTransactionAction, updateTransactionAction } from "@/modules/transactions/actions";
import { createPurchaseAction, updatePurchaseAction } from "@/modules/credit-cards/actions";
import type { PurchaseInput } from "@/modules/credit-cards/schemas";
import { PAYMENT_LABEL } from "@/modules/transactions/schemas";
import { AccountSelect, CategorySelect } from "./category-select";

type Kind = "expense" | "income" | "transfer";

export type TransactionFormValue = {
  id?: string;
  kind: Kind;
  description: string;
  amount: number | null;
  date: string;
  dueDate: string;
  status: "paid" | "pending";
  categoryId: string;
  accountId: string;
  toAccountId: string;
  paymentMethod: string;
  nature: "fixed" | "variable";
  notes: string;
  /** Ocorrência recorrente no cartão (edição): o cartão é fixo e não há conta/status. */
  creditCardId?: string;
  /** Edição de compra no cartão: dados da compra inteira (todas as parcelas). */
  purchase?: { cardId: string; installments: number };
};

const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function emptyTransaction(kind: Kind = "expense", accountId = ""): TransactionFormValue {
  return { kind, description: "", amount: null, date: todayISO(), dueDate: "", status: "paid", categoryId: "", accountId, toAccountId: "", paymentMethod: "pix", nature: "variable", notes: "" };
}

/**
 * Formulário único de movimentação. Despesa no crédito vira compra no cartão (com parcelas),
 * delegando ao módulo de cartões para manter a separação compra × fatura.
 */
export function TransactionForm({ initial, onDone }: { initial: TransactionFormValue; onDone: () => void }) {
  const { accounts, cards } = useLookups();
  const toast = useToast();
  const [v, setV] = useState<TransactionFormValue>({ ...initial, accountId: initial.accountId || accounts[0]?.id || "" });
  const [cardId, setCardId] = useState(initial.purchase?.cardId ?? cards[0]?.id ?? "");
  const [installments, setInstallments] = useState(initial.purchase?.installments ?? 1);
  const [file, setFile] = useState<File | null>(null);
  const editing = !!initial.id;
  const editingPurchase = editing && !!initial.purchase;
  const isCard = (v.kind === "expense" && v.paymentMethod === "credit" && !editing) || editingPurchase;
  const cardOccurrence = editing && !!initial.creditCardId && !editingPurchase;
  const occurrenceCard = cards.find((c) => c.id === initial.creditCardId);
  const set = <K extends keyof TransactionFormValue>(k: K, val: TransactionFormValue[K]) => setV((s) => ({ ...s, [k]: val }));

  const upload = async (id: string) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`/api/transactions/${id}/attachments`, { method: "POST", body: fd });
    if (!r.ok) toast((await r.json().catch(() => ({}))).error ?? "Falha ao enviar o anexo", "error");
  };

  const tx = useAction<TransactionFormValue, unknown>(
    async (input) => {
      const payload = {
        kind: input.kind,
        description: input.description,
        amount: input.amount ?? 0,
        date: input.date,
        dueDate: input.status === "pending" ? input.dueDate || input.date : input.dueDate,
        status: input.status,
        categoryId: input.categoryId,
        accountId: input.accountId,
        toAccountId: input.toAccountId,
        paymentMethod: (input.kind === "transfer" ? "transfer" : input.paymentMethod) as never,
        nature: input.nature,
        notes: input.notes,
      };
      const res: ActionResult<unknown> = editing ? await updateTransactionAction(initial.id!, payload) : await createTransactionAction(payload);
      if (res.ok && !editing && res.data && typeof res.data === "object" && "id" in res.data) await upload(res.data.id as string);
      return res;
    },
    { success: editing ? "Movimentação atualizada" : "Movimentação registrada", onSuccess: onDone },
  );
  const purchase = useAction<PurchaseInput, unknown>(
    (input) => (editingPurchase ? updatePurchaseAction(initial.id!, input) : createPurchaseAction(input)),
    { success: editingPurchase ? "Compra atualizada (todas as parcelas)" : "Compra registrada no cartão", onSuccess: onDone },
  );
  const pending = tx.pending || purchase.pending;
  const err = { ...tx.fieldErrors, ...purchase.fieldErrors };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCard) {
      purchase.run({ cardId, description: v.description, amount: v.amount ?? 0, date: v.date, installments, categoryId: v.categoryId, nature: v.nature, notes: v.notes });
    } else tx.run(v);
  };

  if (!accounts.length)
    return (
      <div className="space-y-3 text-sm text-ink-2">
        <p>Cadastre uma conta antes de registrar movimentações.</p>
        <Link href="/accounts" className="font-semibold underline" onClick={onDone}>
          Ir para Contas
        </Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-4">
      {!editing && (
        <SegTabs<Kind>
          value={v.kind}
          onChange={(k) => setV((s) => ({ ...s, kind: k, categoryId: "", paymentMethod: k === "transfer" ? "transfer" : s.paymentMethod === "transfer" ? "pix" : s.paymentMethod }))}
          items={[
            { value: "expense", label: "Despesa" },
            { value: "income", label: "Receita" },
            { value: "transfer", label: "Transferência" },
          ]}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Descrição" error={err.description} className="sm:col-span-2">
          <Input value={v.description} onChange={(e) => set("description", e.target.value)} placeholder={v.kind === "income" ? "Ex.: Salário" : "Ex.: Mercado"} invalid={!!err.description} autoFocus maxLength={140} />
        </Field>
        <Field label={isCard && installments > 1 ? "Valor total da compra" : "Valor"} error={err.amount}>
          <MoneyInput value={v.amount} onChange={(c) => set("amount", c)} invalid={!!err.amount} />
        </Field>
        <Field label={isCard ? "Data da compra" : "Data"} error={err.date}>
          <Input type="date" value={v.date} onChange={(e) => set("date", e.target.value)} invalid={!!err.date} />
        </Field>

        {v.kind !== "transfer" && (
          <Field label="Categoria" error={err.categoryId}>
            <CategorySelect kind={v.kind} value={v.categoryId} onChange={(c) => set("categoryId", c)} invalid={!!err.categoryId} />
          </Field>
        )}

        {v.kind === "expense" && !editing && (
          <Field label="Forma de pagamento">
            <Select value={v.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
              {Object.entries(PAYMENT_LABEL)
                .filter(([k]) => k !== "credit" || cards.length)
                .map(([k, l]) => (
                  <option key={k} value={k}>
                    {k === "credit" ? "Cartão de crédito" : l}
                  </option>
                ))}
            </Select>
          </Field>
        )}

        {cardOccurrence ? (
          <Field label="Cartão" hint="Cobrança recorrente: a fatura é recalculada pela data.">
            <Input value={occurrenceCard?.name ?? "Cartão"} disabled />
          </Field>
        ) : isCard ? (
          <>
            <Field label="Cartão" error={err.cardId}>
              <Select value={cardId} onChange={(e) => setCardId(e.target.value)}>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Parcelas" error={err.installments} hint={installments > 1 && v.amount ? `${installments}× de ${((v.amount / installments) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : undefined}>
              <Select value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "À vista" : `${n}×`}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : (
          <>
            <Field label={v.kind === "transfer" ? "Conta de origem" : "Conta"} error={err.accountId}>
              <AccountSelect value={v.accountId} onChange={(a) => set("accountId", a)} invalid={!!err.accountId} />
            </Field>
            {v.kind === "transfer" && (
              <Field label="Conta de destino" error={err.toAccountId}>
                <AccountSelect value={v.toAccountId} onChange={(a) => set("toAccountId", a)} invalid={!!err.toAccountId} exclude={v.accountId} />
              </Field>
            )}
            {v.kind !== "transfer" && (
              <Field label="Status">
                <Select value={v.status} onChange={(e) => set("status", e.target.value as "paid" | "pending")}>
                  <option value="paid">{v.kind === "income" ? "Recebido" : "Pago"}</option>
                  <option value="pending">{v.kind === "income" ? "A receber" : "A pagar"}</option>
                </Select>
              </Field>
            )}
            {v.kind !== "transfer" && v.status === "pending" && (
              <Field label="Vencimento" error={err.dueDate} hint="Padrão: a data da movimentação">
                <Input type="date" value={v.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
              </Field>
            )}
          </>
        )}

        {v.kind === "expense" && !cardOccurrence && (
          <Field label="Natureza">
            <Select value={v.nature} onChange={(e) => set("nature", e.target.value as "fixed" | "variable")}>
              <option value="variable">Variável</option>
              <option value="fixed">Fixa</option>
            </Select>
          </Field>
        )}

        <Field label="Observações" className="sm:col-span-2">
          <Textarea value={v.notes} onChange={(e) => set("notes", e.target.value)} rows={2} maxLength={1000} />
        </Field>

        {!editing && !isCard && (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-2 sm:col-span-2">
            <Paperclip size={14} />
            {file ? file.name : "Anexar comprovante (PDF ou imagem, até 5 MB)"}
            <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </div>

      {editingPurchase && (
        <p className="rounded-xl bg-muted px-3 py-2 text-xs text-ink-2">
          Você está editando a compra inteira: ao salvar, todas as parcelas e faturas são recalculadas. Pagamentos de fatura já feitos não mudam.
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          {editing ? "Salvar alterações" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
