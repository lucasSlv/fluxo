"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuickAdd } from "@/components/layout/quick-add";
import type { TransactionFormValue } from "@/components/finance/transaction-form";

export function NewTransactionButton({ label = "Nova movimentação", initial, variant = "primary" }: { label?: string; initial?: Partial<TransactionFormValue>; variant?: "primary" | "secondary" }) {
  const open = useQuickAdd();
  return (
    <Button variant={variant} onClick={() => open(initial)}>
      <Plus size={16} strokeWidth={2.5} /> {label}
    </Button>
  );
}
