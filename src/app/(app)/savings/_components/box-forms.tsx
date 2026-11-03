"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { SegTabs } from "@/components/ui/tabs";
import { ICON_NAMES } from "@/components/ui/icon";
import { AccountSelect } from "@/components/finance/category-select";
import { useLookups } from "@/components/layout/lookups";
import { useAction } from "@/hooks/use-action";
import type { ActionResult } from "@/lib/errors";
import { createBoxAction, deleteBoxAction, deleteBoxMoveAction, moveBoxAction, updateBoxAction } from "@/modules/savings/actions";
import { formatMoney } from "@/lib/money";

const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const COLORS = ["#111111", "#16a34a", "#2563eb", "#9333ea", "#ea580c", "#db2777", "#0d9488", "#ca8a04"];

type BoxValue = { id?: string; name: string; target: number | null; color: string; icon: string };

export function BoxFormButton({ initial }: { initial?: BoxValue }) {
  const [open, setOpen] = useState(false);
  const blank: BoxValue = { name: "", target: null, color: "#111111", icon: "piggy-bank" };
  const [v, setV] = useState<BoxValue>(initial ?? blank);
  const editing = !!initial?.id;
  const { run, pending, fieldErrors: err } = useAction<BoxValue, unknown>(
    (input): Promise<ActionResult<unknown>> => {
      const payload = { name: input.name, target: input.target, color: input.color, icon: input.icon };
      return editing ? updateBoxAction(initial!.id!, payload) : createBoxAction(payload);
    },
    {
      success: editing ? "Caixinha atualizada" : "Caixinha criada",
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
          <Plus size={16} strokeWidth={2.5} /> Nova caixinha
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar caixinha" : "Nova caixinha"}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(v);
          }}
        >
          <Field label="Nome" error={err.name}>
            <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Ex.: Reserva de emergência" autoFocus invalid={!!err.name} />
          </Field>
          <Field label="Meta (opcional)" error={err.target}>
            <MoneyInput value={v.target} onChange={(c) => setV({ ...v, target: c })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ícone">
              <Select value={v.icon} onChange={(e) => setV({ ...v, icon: e.target.value })}>
                {ICON_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-ink-2">Cor</span>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setV({ ...v, color: c })} aria-label={`Cor ${c}`} className={`h-7 w-7 rounded-full ring-offset-2 ${v.color === c ? "ring-2 ring-ink" : ""}`} style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function MoveBoxButton({ boxId, boxName, balance, size = "sm" }: { boxId: string; boxName: string; balance: number; size?: "sm" | "md" }) {
  const { accounts } = useLookups();
  const [open, setOpen] = useState(false);
  const [dir, setDir] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(todayISO());
  const [acc, setAcc] = useState(accounts[0]?.id ?? "");
  const { run, pending, fieldErrors: err } = useAction(moveBoxAction, {
    success: "Movimentação registrada",
    onSuccess: () => {
      setOpen(false);
      setAmount(null);
    },
  });
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        Movimentar
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={boxName} description="Guardar ou resgatar é uma transferência entre sua conta e a caixinha — não conta como receita nem despesa." size="sm">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run({ boxId, accountId: acc, amount: amount ?? 0, date, direction: dir });
          }}
        >
          <SegTabs<"deposit" | "withdrawal">
            value={dir}
            onChange={setDir}
            items={[
              { value: "deposit", label: "Guardar" },
              { value: "withdrawal", label: "Resgatar" },
            ]}
          />
          <Field label="Valor" error={err.amount} hint={dir === "withdrawal" ? `Disponível: ${formatMoney(balance)}` : undefined}>
            <MoneyInput value={amount} onChange={setAmount} invalid={!!err.amount} autoFocus />
          </Field>
          <Field label={dir === "deposit" ? "Sai da conta" : "Volta para a conta"} error={err.accountId}>
            <AccountSelect value={acc} onChange={setAcc} invalid={!!err.accountId} />
          </Field>
          <Field label="Data" error={err.date}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {dir === "deposit" ? (
                <>
                  <ArrowDownToLine size={15} /> Guardar
                </>
              ) : (
                <>
                  <ArrowUpFromLine size={15} /> Resgatar
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function DeleteBoxButton({ id, redirectTo }: { id: string; redirectTo?: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      action={async () => {
        const r = await deleteBoxAction(id);
        if (r.ok && redirectTo) router.push(redirectTo);
        return r;
      }}
      title="Excluir caixinha?"
      description="Só é possível excluir caixinhas zeradas. Com histórico, ela é arquivada."
      confirmLabel="Excluir"
      success="Caixinha removida"
    >
      <Trash2 size={14} />
    </ConfirmButton>
  );
}

export function UndoMoveButton({ txId }: { txId: string }) {
  return (
    <ConfirmButton action={() => deleteBoxMoveAction(txId)} title="Desfazer movimentação?" description="O valor volta para a origem e o registro é removido." confirmLabel="Desfazer" success="Movimentação desfeita">
      <Undo2 size={14} />
    </ConfirmButton>
  );
}
