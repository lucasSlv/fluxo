"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { AccountSelect } from "@/components/finance/category-select";
import { useAction } from "@/hooks/use-action";
import { deleteDebtAction, extraPaymentAction, setInstallmentStatusAction } from "@/modules/debts/actions";
import { formatMoney } from "@/lib/money";

export function DeleteDebtButton({ id, redirectTo }: { id: string; redirectTo?: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      action={async () => {
        const r = await deleteDebtAction(id);
        if (r.ok && redirectTo) router.push(redirectTo);
        return r;
      }}
      title="Excluir dívida?"
      description="Sem pagamentos, a dívida e as parcelas são removidas. Com pagamentos registrados, ela é cancelada e o histórico é mantido."
      confirmLabel="Excluir"
      success="Dívida removida"
    >
      <Trash2 size={14} /> Excluir
    </ConfirmButton>
  );
}

export function InstallmentButton({ debtId, txId, paid }: { debtId: string; txId: string; paid: boolean }) {
  const { run, pending } = useAction((s: "paid" | "pending") => setInstallmentStatusAction(debtId, txId, s), {
    success: paid ? "Pagamento desfeito" : "Parcela paga",
  });
  return (
    <Button size="sm" variant={paid ? "secondary" : "primary"} loading={pending} onClick={() => run(paid ? "pending" : "paid")}>
      {paid ? "Desfazer" : "Pagar"}
    </Button>
  );
}

export function ExtraPaymentButton({ debtId, accountId, outstanding }: { debtId: string; accountId: string; outstanding: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  const [acc, setAcc] = useState(accountId);
  const { run, pending, fieldErrors: err } = useAction((input: { amount: number; date: string; accountId: string }) => extraPaymentAction(debtId, input), {
    success: "Amortização registrada",
    onSuccess: () => setOpen(false),
  });
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={outstanding <= 0}>
        Amortizar
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Amortização" description={`Abate das últimas parcelas (reduz o prazo). Saldo devedor: ${formatMoney(outstanding)}.`} size="sm">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run({ amount: amount ?? 0, date, accountId: acc });
          }}
        >
          <Field label="Valor" error={err.amount}>
            <MoneyInput value={amount} onChange={setAmount} invalid={!!err.amount} autoFocus />
          </Field>
          <Field label="Data" error={err.date}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Conta" error={err.accountId}>
            <AccountSelect value={acc} onChange={setAcc} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              Registrar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
