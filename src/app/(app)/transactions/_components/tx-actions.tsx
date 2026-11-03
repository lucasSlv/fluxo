"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Check, Eye, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { useQuickAdd } from "@/components/layout/quick-add";
import { deleteTransactionAction, setTransactionStatusAction } from "@/modules/transactions/actions";
import type { TransactionFormValue } from "@/components/finance/transaction-form";

export type TxActionData = {
  id: string;
  kind: string;
  status: string;
  editable: boolean;
  payable: boolean;
  recurring: boolean;
  installmentGroup: boolean;
  form: TransactionFormValue;
};

/** Menu de ações de uma movimentação (editar, pagar/desfazer, excluir, detalhes). */
export function TxActions({ tx }: { tx: TxActionData }) {
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openForm = useQuickAdd();
  const status = useAction((s: "paid" | "pending") => setTransactionStatusAction(tx.id, s), { success: "Status atualizado" });
  const del = useAction(() => deleteTransactionAction(tx.id), {
    success: tx.recurring ? "Ocorrência cancelada" : "Movimentação excluída",
    onSuccess: () => setConfirm(false),
  });

  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menu]);

  const item = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted";
  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-1.5">
        {tx.payable && tx.status === "pending" && (
          <Button size="sm" loading={status.pending} onClick={() => status.run("paid")}>
            {tx.kind === "income" ? "Receber" : "Pagar"}
          </Button>
        )}
        <button onClick={() => setMenu((m) => !m)} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-neutral-200 hover:text-ink" aria-label="Ações">
          <MoreHorizontal size={16} />
        </button>
      </div>
      {menu && (
        <div className="absolute right-0 top-10 z-20 w-52 animate-in rounded-xl bg-surface p-1.5 shadow-float">
          <Link href={`/transactions/${tx.id}`} className={item}>
            <Eye size={14} /> Detalhes e anexos
          </Link>
          {tx.editable && (
            <button className={item} onClick={() => (setMenu(false), openForm(tx.form))}>
              <Pencil size={14} /> {tx.recurring ? "Editar só esta ocorrência" : "Editar"}
            </button>
          )}
          {tx.payable && tx.status === "paid" && (
            <button className={item} onClick={() => (setMenu(false), status.run("pending"))}>
              <RotateCcw size={14} /> Marcar como pendente
            </button>
          )}
          {tx.payable && tx.status === "pending" && (
            <button className={item} onClick={() => (setMenu(false), status.run("paid"))}>
              <Check size={14} /> Marcar como {tx.kind === "income" ? "recebido" : "pago"}
            </button>
          )}
          {tx.status !== "cancelled" && (
            <button className={`${item} text-neg`} onClick={() => (setMenu(false), setConfirm(true))}>
              <Trash2 size={14} /> {tx.recurring ? "Cancelar esta ocorrência" : "Excluir"}
            </button>
          )}
        </div>
      )}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title={tx.recurring ? "Cancelar ocorrência?" : "Excluir movimentação?"}
        description={
          tx.recurring
            ? "Somente esta ocorrência será cancelada. A recorrência continua gerando as próximas."
            : tx.installmentGroup
              ? "Esta é uma parcela de compra no cartão: todas as parcelas da compra serão excluídas."
              : "Esta ação não pode ser desfeita. O saldo das contas será recalculado."
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Voltar
          </Button>
          <Button variant="danger" loading={del.pending} onClick={() => del.run(undefined as never)}>
            Confirmar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
