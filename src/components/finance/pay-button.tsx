"use client";

import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { setTransactionStatusAction } from "@/modules/transactions/actions";

export function PayButton({ id, kind, size = "sm", undo }: { id: string; kind: string; size?: "sm" | "md"; undo?: boolean }) {
  const { run, pending } = useAction((s: "paid" | "pending") => setTransactionStatusAction(id, s), {
    success: undo ? "Marcado como pendente" : kind === "income" ? "Recebimento confirmado" : "Pagamento confirmado",
  });
  return (
    <Button size={size} variant={undo ? "secondary" : "primary"} loading={pending} onClick={() => run(undo ? "pending" : "paid")}>
      {undo ? "Desfazer" : kind === "income" ? "Receber" : "Pagar"}
    </Button>
  );
}
