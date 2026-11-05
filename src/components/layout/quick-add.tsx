"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { TransactionForm, emptyTransaction, type TransactionFormValue } from "@/components/finance/transaction-form";

const Ctx = createContext<(initial?: Partial<TransactionFormValue>) => void>(() => {});

/** Modal global de "nova movimentação", acessível de qualquer tela. */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TransactionFormValue | null>(null);
  const open = useCallback((initial?: Partial<TransactionFormValue>) => setState({ ...emptyTransaction(), ...initial }), []);
  return (
    <Ctx value={open}>
      {children}
      <Modal open={!!state} onClose={() => setState(null)} title={state?.purchase ? "Editar compra no cartão" : state?.id ? "Editar movimentação" : "Nova movimentação"} size="lg">
        {state && <TransactionForm key={state.id ?? "new"} initial={state} onDone={() => setState(null)} />}
      </Modal>
    </Ctx>
  );
}

export const useQuickAdd = () => useContext(Ctx);
