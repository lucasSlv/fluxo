"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Modal baseado em <dialog> nativo (foco, ESC e acessibilidade de graça). */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-3xl bg-surface p-0 text-ink shadow-float open:animate-in",
        { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[size],
      )}
    >
      {open && (
        <div className="max-h-[85dvh] overflow-y-auto p-6 scroll-thin">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
            </div>
            <button onClick={onClose} className="-mr-2 -mt-1 rounded-full p-2 text-ink-3 hover:bg-muted hover:text-ink" aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
