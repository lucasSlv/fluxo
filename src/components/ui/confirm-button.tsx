"use client";

import { useState, type ReactNode } from "react";
import type { ActionResult } from "@/lib/errors";
import { useAction } from "@/hooks/use-action";
import { Button, type ButtonProps } from "./button";
import { Modal } from "./modal";

/** Botão que pede confirmação antes de executar uma ação destrutiva. */
export function ConfirmButton<O>({
  action,
  title,
  description,
  confirmLabel = "Confirmar",
  success,
  children,
  variant = "ghost",
  size = "sm",
  className,
  tone = "danger",
}: {
  action: () => Promise<ActionResult<O>>;
  title: string;
  description?: string;
  confirmLabel?: string;
  success?: string;
  children: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  tone?: "danger" | "primary";
}) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useAction(action, { success, onSuccess: () => setOpen(false) });
  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description} size="sm">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant={tone} loading={pending} onClick={() => run(undefined as never)}>
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
