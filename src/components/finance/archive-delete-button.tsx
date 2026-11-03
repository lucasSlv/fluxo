"use client";

import { useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useAction } from "@/hooks/use-action";
import type { ActionResult } from "@/lib/errors";

/** Confirmação de exclusão cujo resultado pode ser "deleted" ou "archived" (histórico preservado). */
export function ArchiveDeleteButton({
  action,
  title,
  description,
  labels = { deleted: "Excluído", archived: "Arquivado para preservar o histórico" },
  children,
  variant = "ghost",
  size = "icon",
  onDeleted,
}: {
  action: () => Promise<ActionResult<"deleted" | "archived">>;
  title: string;
  description?: string;
  labels?: { deleted: string; archived: string };
  children: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  onDeleted?: (r: "deleted" | "archived") => void;
}) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const { run, pending } = useAction(action, {
    onSuccess: (r) => {
      setOpen(false);
      toast(labels[r]);
      onDeleted?.(r);
    },
  });
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} aria-label="Excluir">
        {children}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description} size="sm">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" loading={pending} onClick={() => run(undefined as never)}>
            Excluir
          </Button>
        </div>
      </Modal>
    </>
  );
}
